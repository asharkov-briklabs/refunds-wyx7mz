import json
import uuid
import logging
import datetime
from decimal import Decimal
from enum import Enum
from typing import Dict, List, Optional, Any, Union

# Assuming these imports would be available in the actual implementation
from src.models.refund_request import RefundRequest, RefundStatus
from src.services.payment_method_handler import PaymentMethodHandler
from src.services.approval_workflow_engine import ApprovalWorkflowEngine
from src.services.compliance_engine import ComplianceEngine
from src.services.gateway_integration_service import GatewayIntegrationService
from src.services.parameter_resolution_service import ParameterResolutionService
from src.services.notification_service import NotificationService
from src.repositories.refund_repository import RefundRepository
from src.events.event_publisher import EventPublisher
from src.exceptions.refund_exceptions import (
    RefundValidationError,
    RefundProcessingError,
    RefundNotFoundException,
    RefundStateTransitionError,
    InsufficientPermissionsError,
    GatewayIntegrationError,
)
from src.utils.logger import get_logger
from src.utils.idempotency import IdempotencyKey
from src.utils.lock_manager import acquire_distributed_lock, LockAcquisitionError

logger = get_logger(__name__)

class RefundRequestManager:
    """
    Orchestrates the complete lifecycle of refund requests, managing state transitions,
    validation rules, and workflow coordination across all dependent services.
    """

    def __init__(
        self,
        payment_method_handler: PaymentMethodHandler,
        approval_workflow_engine: ApprovalWorkflowEngine,
        compliance_engine: ComplianceEngine,
        gateway_integration_service: GatewayIntegrationService,
        parameter_service: ParameterResolutionService,
        notification_service: NotificationService,
        refund_repository: RefundRepository,
        event_publisher: EventPublisher,
    ):
        """
        Initialize the RefundRequestManager with required service dependencies.
        
        Args:
            payment_method_handler: Handles payment method-specific logic
            approval_workflow_engine: Manages approval workflows for refunds
            compliance_engine: Enforces compliance rules and policies
            gateway_integration_service: Integrates with payment gateways
            parameter_service: Provides configuration parameters
            notification_service: Sends notifications to users
            refund_repository: Stores and retrieves refund data
            event_publisher: Publishes events for state changes
        """
        self.payment_method_handler = payment_method_handler
        self.approval_workflow_engine = approval_workflow_engine
        self.compliance_engine = compliance_engine
        self.gateway_integration_service = gateway_integration_service
        self.parameter_service = parameter_service
        self.notification_service = notification_service
        self.refund_repository = refund_repository
        self.event_publisher = event_publisher
        
        logger.info("RefundRequestManager initialized with all dependencies")

    def create_refund_request(
        self,
        transaction_id: str,
        amount: Decimal,
        reason: str,
        reason_code: str,
        refund_method: Optional[str] = None,
        bank_account_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        supporting_documents: Optional[List[Dict[str, str]]] = None,
        idempotency_key: Optional[str] = None,
        requestor_id: str = None,
    ) -> RefundRequest:
        """
        Create a new refund request with the specified parameters.
        
        Args:
            transaction_id: ID of the original transaction to refund
            amount: Amount to refund
            reason: Description of why the refund is being processed
            reason_code: Standardized code categorizing the refund reason
            refund_method: Method to use for refund (ORIGINAL_PAYMENT, BALANCE, OTHER)
            bank_account_id: Bank account ID (required for OTHER refund method)
            metadata: Additional refund-specific data
            supporting_documents: List of documents supporting the refund request
            idempotency_key: Key to ensure request is processed exactly once
            requestor_id: ID of the user making the request
            
        Returns:
            The created RefundRequest object
            
        Raises:
            RefundValidationError: If the refund request is invalid
            InsufficientPermissionsError: If the requestor lacks permissions
            GatewayIntegrationError: If there's an issue communicating with payment services
        """
        logger.info(f"Creating refund request for transaction {transaction_id}")
        
        # Use provided idempotency key or generate one
        idempotency_key = idempotency_key or f"refund_{transaction_id}_{uuid.uuid4()}"
        
        try:
            # Acquire lock using idempotency key to prevent race conditions
            with IdempotencyKey(idempotency_key):
                # Check if request already exists with this idempotency key
                existing_request = self.refund_repository.find_by_idempotency_key(idempotency_key)
                if existing_request:
                    logger.info(f"Found existing request with idempotency key {idempotency_key}")
                    return existing_request
                    
                # Validate transaction
                transaction = self._validate_transaction(transaction_id)
                
                # Validate amount
                self._validate_refund_amount(amount, transaction)
                
                # Validate refund method
                selected_refund_method = self._determine_refund_method(
                    transaction, refund_method, bank_account_id
                )
                
                # Create refund request in DRAFT state
                refund_request = RefundRequest(
                    refund_request_id=f"req_{uuid.uuid4()}",
                    transaction_id=transaction_id,
                    merchant_id=transaction.merchant_id,
                    amount=amount,
                    currency=transaction.currency,
                    refund_method=selected_refund_method,
                    reason=reason,
                    reason_code=reason_code,
                    bank_account_id=bank_account_id if selected_refund_method == "OTHER" else None,
                    status=RefundStatus.DRAFT,
                    requestor_id=requestor_id,
                    metadata=metadata or {},
                    supporting_documents=supporting_documents or [],
                    created_at=datetime.datetime.now(),
                    idempotency_key=idempotency_key,
                )
                
                # Save initial draft
                self.refund_repository.save(refund_request)
                
                # Add initial status to history
                refund_request.add_status_history(
                    status=RefundStatus.DRAFT,
                    changed_by=requestor_id,
                )
                
                # Validate compliance
                compliance_result = self.compliance_engine.validate_compliance(
                    refund_request,
                    {
                        "transaction": transaction,
                        "merchant_id": transaction.merchant_id,
                    }
                )
                
                if not compliance_result.compliant:
                    refund_request.status = RefundStatus.VALIDATION_FAILED
                    refund_request.add_status_history(
                        status=RefundStatus.VALIDATION_FAILED,
                        changed_by="system",
                        reason=f"Compliance violations: {compliance_result.violation_details}"
                    )
                    self.refund_repository.update(refund_request)
                    
                    # Publish event for validation failure
                    self._publish_status_change_event(
                        refund_request, 
                        RefundStatus.DRAFT, 
                        RefundStatus.VALIDATION_FAILED
                    )
                    
                    raise RefundValidationError(
                        f"Refund request failed compliance validation: {compliance_result.violation_details}"
                    )
                
                # Update status to SUBMITTED
                refund_request.status = RefundStatus.SUBMITTED
                refund_request.add_status_history(
                    status=RefundStatus.SUBMITTED,
                    changed_by="system",
                )
                self.refund_repository.update(refund_request)
                
                # Publish event for submission
                self._publish_status_change_event(
                    refund_request, 
                    RefundStatus.DRAFT, 
                    RefundStatus.SUBMITTED
                )
                
                # Check if approval is required
                if self._requires_approval(refund_request):
                    # Create approval request
                    approval_request = self.approval_workflow_engine.create_approval_request(refund_request)
                    
                    # Update status to PENDING_APPROVAL
                    refund_request.status = RefundStatus.PENDING_APPROVAL
                    refund_request.approval_id = approval_request.approval_id
                    refund_request.add_status_history(
                        status=RefundStatus.PENDING_APPROVAL,
                        changed_by="system",
                    )
                    self.refund_repository.update(refund_request)
                    
                    # Publish event for pending approval
                    self._publish_status_change_event(
                        refund_request, 
                        RefundStatus.SUBMITTED, 
                        RefundStatus.PENDING_APPROVAL
                    )
                    
                    # Send notification for approval request
                    self.notification_service.send_notification(
                        notification_type="APPROVAL_REQUESTED",
                        recipient=approval_request.get_current_approvers(),
                        channel="EMAIL",
                        context={
                            "refund_request": refund_request,
                            "approval_request": approval_request,
                            "transaction": transaction,
                        }
                    )
                else:
                    # No approval required, move directly to processing
                    self.process_refund_request(refund_request.refund_request_id)
                
                logger.info(f"Refund request {refund_request.refund_request_id} created successfully")
                return refund_request
                
        except IdempotencyKey.IdempotencyKeyExists:
            # Request is currently being processed, retrieve and return current state
            existing_request = self.refund_repository.find_by_idempotency_key(idempotency_key)
            if existing_request:
                return existing_request
            else:
                # This should rarely happen - only in case of a race condition
                logger.warning(f"Idempotency key exists but no request found: {idempotency_key}")
                raise RefundProcessingError("Concurrent operation in progress, please retry")
        
        except Exception as e:
            logger.error(f"Error creating refund request: {str(e)}", exc_info=True)
            raise
    
    def process_refund_request(self, refund_request_id: str) -> RefundRequest:
        """
        Process a validated refund request through the appropriate payment method handler.
        
        Args:
            refund_request_id: ID of the refund request to process
            
        Returns:
            The updated RefundRequest object
            
        Raises:
            RefundNotFoundException: If the refund request doesn't exist
            RefundStateTransitionError: If the refund is in an invalid state for processing
            RefundProcessingError: If there's an error during processing
        """
        logger.info(f"Processing refund request {refund_request_id}")
        
        # Get refund request
        refund_request = self.refund_repository.find_by_id(refund_request_id)
        if not refund_request:
            raise RefundNotFoundException(f"Refund request not found: {refund_request_id}")
        
        # Validate state transition
        if refund_request.status not in [RefundStatus.SUBMITTED, RefundStatus.PENDING_APPROVAL]:
            raise RefundStateTransitionError(
                f"Cannot process refund in state {refund_request.status}"
            )
        
        # If in PENDING_APPROVAL state, verify approval is complete
        if refund_request.status == RefundStatus.PENDING_APPROVAL:
            approval_status = self.approval_workflow_engine.get_approval_status(refund_request.approval_id)
            if not approval_status.is_approved():
                raise RefundStateTransitionError(
                    f"Refund {refund_request_id} requires approval before processing"
                )
        
        try:
            # Update status to PROCESSING
            previous_status = refund_request.status
            refund_request.status = RefundStatus.PROCESSING
            refund_request.add_status_history(
                status=RefundStatus.PROCESSING,
                changed_by="system",
            )
            self.refund_repository.update(refund_request)
            
            # Publish event for processing status
            self._publish_status_change_event(
                refund_request, 
                previous_status, 
                RefundStatus.PROCESSING
            )
            
            # Get transaction details
            transaction = self._validate_transaction(refund_request.transaction_id)
            
            # Process refund through payment method handler
            processing_result = self.payment_method_handler.process_refund(
                refund_request=refund_request,
                transaction=transaction
            )
            
            if processing_result.success:
                # Update with successful result
                refund_request.status = RefundStatus.COMPLETED
                refund_request.gateway_reference = processing_result.gateway_reference
                refund_request.processed_at = datetime.datetime.now()
                refund_request.completed_at = datetime.datetime.now()
                refund_request.add_status_history(
                    status=RefundStatus.COMPLETED,
                    changed_by="system",
                )
                self.refund_repository.update(refund_request)
                
                # Publish completion event
                self._publish_status_change_event(
                    refund_request, 
                    RefundStatus.PROCESSING, 
                    RefundStatus.COMPLETED
                )
                
                # Send completion notification
                self._send_completion_notification(refund_request, transaction)
                
                logger.info(f"Refund {refund_request_id} processed successfully")
                
            else:
                # Handle processing failure
                refund_request.status = RefundStatus.FAILED
                refund_request.add_status_history(
                    status=RefundStatus.FAILED,
                    changed_by="system",
                    reason=f"Processing error: {processing_result.error_message}"
                )
                refund_request.processing_errors.append({
                    "error_code": processing_result.error_code,
                    "error_message": processing_result.error_message,
                    "occurred_at": datetime.datetime.now().isoformat()
                })
                self.refund_repository.update(refund_request)
                
                # Publish failure event
                self._publish_status_change_event(
                    refund_request, 
                    RefundStatus.PROCESSING, 
                    RefundStatus.FAILED
                )
                
                # Send failure notification
                self._send_failure_notification(refund_request, processing_result.error_message)
                
                logger.error(f"Refund {refund_request_id} processing failed: {processing_result.error_message}")
            
            return refund_request
            
        except Exception as e:
            # Handle unexpected exceptions
            logger.error(f"Error processing refund {refund_request_id}: {str(e)}", exc_info=True)
            
            # Update refund status to FAILED
            refund_request.status = RefundStatus.FAILED
            refund_request.add_status_history(
                status=RefundStatus.FAILED,
                changed_by="system",
                reason=f"System error: {str(e)}"
            )
            refund_request.processing_errors.append({
                "error_code": "SYSTEM_ERROR",
                "error_message": str(e),
                "occurred_at": datetime.datetime.now().isoformat()
            })
            self.refund_repository.update(refund_request)
            
            # Publish failure event
            self._publish_status_change_event(
                refund_request, 
                RefundStatus.PROCESSING, 
                RefundStatus.FAILED
            )
            
            raise RefundProcessingError(f"Error processing refund: {str(e)}")

    def handle_approval_decision(self, approval_id: str, decision: bool, decision_notes: Optional[str] = None) -> RefundRequest:
        """
        Handle the result of an approval decision for a refund request.
        
        Args:
            approval_id: ID of the approval request
            decision: True for approval, False for rejection
            decision_notes: Optional notes explaining the decision
            
        Returns:
            The updated RefundRequest object
            
        Raises:
            RefundNotFoundException: If the associated refund request doesn't exist
            RefundStateTransitionError: If the refund is in an invalid state
        """
        logger.info(f"Handling approval decision for approval {approval_id}: {'Approved' if decision else 'Rejected'}")
        
        # Get refund request by approval ID
        refund_request = self.refund_repository.find_by_approval_id(approval_id)
        if not refund_request:
            raise RefundNotFoundException(f"No refund request found for approval {approval_id}")
        
        # Verify refund is in PENDING_APPROVAL state
        if refund_request.status != RefundStatus.PENDING_APPROVAL:
            raise RefundStateTransitionError(
                f"Cannot process approval decision for refund in state {refund_request.status}"
            )
        
        try:
            if decision:
                # Approval granted - process the refund
                logger.info(f"Approval granted for refund {refund_request.refund_request_id}")
                
                # Process approved refund
                return self.process_refund_request(refund_request.refund_request_id)
            else:
                # Approval rejected - update status
                logger.info(f"Approval rejected for refund {refund_request.refund_request_id}")
                
                refund_request.status = RefundStatus.REJECTED
                refund_request.add_status_history(
                    status=RefundStatus.REJECTED,
                    changed_by="system",
                    reason=decision_notes or "Refund request rejected"
                )
                self.refund_repository.update(refund_request)
                
                # Publish rejection event
                self._publish_status_change_event(
                    refund_request, 
                    RefundStatus.PENDING_APPROVAL, 
                    RefundStatus.REJECTED
                )
                
                # Send rejection notification
                self._send_rejection_notification(refund_request, decision_notes)
                
                return refund_request
                
        except Exception as e:
            logger.error(f"Error handling approval decision: {str(e)}", exc_info=True)
            raise
    
    def cancel_refund_request(
        self, 
        refund_request_id: str, 
        cancellation_reason: str,
        user_id: str
    ) -> RefundRequest:
        """
        Cancel a refund request that hasn't been completed yet.
        
        Args:
            refund_request_id: ID of the refund request to cancel
            cancellation_reason: Reason for cancellation
            user_id: ID of the user cancelling the refund
            
        Returns:
            The updated RefundRequest object
            
        Raises:
            RefundNotFoundException: If the refund request doesn't exist
            RefundStateTransitionError: If the refund is in a state that can't be cancelled
            InsufficientPermissionsError: If the user lacks cancellation permissions
        """
        logger.info(f"Cancelling refund request {refund_request_id}")
        
        # Get refund request
        refund_request = self.refund_repository.find_by_id(refund_request_id)
        if not refund_request:
            raise RefundNotFoundException(f"Refund request not found: {refund_request_id}")
        
        # Check permission to cancel
        if not self._can_cancel_refund(refund_request, user_id):
            raise InsufficientPermissionsError(
                f"User {user_id} does not have permission to cancel refund {refund_request_id}"
            )
        
        # Validate state allows cancellation
        cancellable_states = [
            RefundStatus.DRAFT, 
            RefundStatus.SUBMITTED, 
            RefundStatus.PENDING_APPROVAL
        ]
        
        if refund_request.status not in cancellable_states:
            raise RefundStateTransitionError(
                f"Cannot cancel refund in state {refund_request.status}"
            )
        
        try:
            previous_status = refund_request.status
            
            # If in approval state, cancel the approval first
            if refund_request.status == RefundStatus.PENDING_APPROVAL and refund_request.approval_id:
                self.approval_workflow_engine.cancel_approval_request(
                    refund_request.approval_id, 
                    f"Refund request cancelled: {cancellation_reason}"
                )
            
            # Update refund status
            refund_request.status = RefundStatus.CANCELED
            refund_request.add_status_history(
                status=RefundStatus.CANCELED,
                changed_by=user_id,
                reason=cancellation_reason
            )
            self.refund_repository.update(refund_request)
            
            # Publish cancellation event
            self._publish_status_change_event(
                refund_request, 
                previous_status, 
                RefundStatus.CANCELED
            )
            
            # Send cancellation notification
            self._send_cancellation_notification(refund_request, cancellation_reason)
            
            logger.info(f"Refund request {refund_request_id} cancelled successfully")
            return refund_request
            
        except Exception as e:
            logger.error(f"Error cancelling refund {refund_request_id}: {str(e)}", exc_info=True)
            raise

    def get_refund_request(self, refund_request_id: str) -> RefundRequest:
        """
        Retrieve a refund request by ID.
        
        Args:
            refund_request_id: ID of the refund request to retrieve
            
        Returns:
            The RefundRequest object
            
        Raises:
            RefundNotFoundException: If the refund request doesn't exist
        """
        refund_request = self.refund_repository.find_by_id(refund_request_id)
        if not refund_request:
            raise RefundNotFoundException(f"Refund request not found: {refund_request_id}")
        
        return refund_request

    def list_refund_requests(
        self,
        merchant_id: Optional[str] = None,
        status: Optional[List[str]] = None,
        from_date: Optional[datetime.datetime] = None,
        to_date: Optional[datetime.datetime] = None,
        transaction_id: Optional[str] = None,
        page: int = 0,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        """
        List refund requests with optional filtering.
        
        Args:
            merchant_id: Filter by merchant ID
            status: Filter by refund status
            from_date: Filter by created date (from)
            to_date: Filter by created date (to)
            transaction_id: Filter by original transaction ID
            page: Page number for pagination (0-based)
            page_size: Number of items per page
            
        Returns:
            Dict containing refund requests and pagination metadata
        """
        filters = {}
        
        if merchant_id:
            filters["merchant_id"] = merchant_id
            
        if status:
            filters["status"] = status
            
        if from_date:
            filters["created_at_from"] = from_date
            
        if to_date:
            filters["created_at_to"] = to_date
            
        if transaction_id:
            filters["transaction_id"] = transaction_id
        
        # Get paginated results
        result = self.refund_repository.find_by_filters(
            filters=filters,
            page=page,
            page_size=page_size
        )
        
        return {
            "refund_requests": result.items,
            "total": result.total,
            "page": page,
            "page_size": page_size,
            "total_pages": (result.total + page_size - 1) // page_size
        }

    def handle_gateway_webhook(self, gateway_type: str, event_data: Dict[str, Any]) -> bool:
        """
        Handle webhook events from payment gateways for refund status updates.
        
        Args:
            gateway_type: Type of gateway (e.g., "STRIPE", "ADYEN")
            event_data: Webhook event payload
            
        Returns:
            True if the event was handled successfully
        """
        logger.info(f"Handling {gateway_type} webhook event")
        
        try:
            # Extract refund reference from event data
            gateway_reference = self.gateway_integration_service.extract_gateway_reference(
                gateway_type, 
                event_data
            )
            
            if not gateway_reference:
                logger.warning(f"Could not extract gateway reference from {gateway_type} event")
                return False
                
            # Find refund by gateway reference
            refund_request = self.refund_repository.find_by_gateway_reference(gateway_reference)
            if not refund_request:
                logger.warning(f"No refund found for gateway reference {gateway_reference}")
                return False
                
            # Extract refund status from webhook
            webhook_status = self.gateway_integration_service.extract_refund_status(
                gateway_type, 
                event_data
            )
            
            if webhook_status == "COMPLETED":
                # Update refund to completed if not already
                if refund_request.status != RefundStatus.COMPLETED:
                    previous_status = refund_request.status
                    refund_request.status = RefundStatus.COMPLETED
                    refund_request.completed_at = datetime.datetime.now()
                    refund_request.add_status_history(
                        status=RefundStatus.COMPLETED,
                        changed_by="system",
                        reason=f"Completed via {gateway_type} webhook"
                    )
                    self.refund_repository.update(refund_request)
                    
                    # Publish status change event
                    self._publish_status_change_event(
                        refund_request, 
                        previous_status, 
                        RefundStatus.COMPLETED
                    )
                    
                    # Send completion notification
                    transaction = self._validate_transaction(refund_request.transaction_id)
                    self._send_completion_notification(refund_request, transaction)
                
            elif webhook_status == "FAILED":
                # Update refund to failed if not already completed
                if refund_request.status not in [RefundStatus.COMPLETED, RefundStatus.FAILED]:
                    previous_status = refund_request.status
                    refund_request.status = RefundStatus.FAILED
                    refund_request.add_status_history(
                        status=RefundStatus.FAILED,
                        changed_by="system",
                        reason=f"Failed via {gateway_type} webhook"
                    )
                    
                    # Extract error details if available
                    error_details = self.gateway_integration_service.extract_error_details(
                        gateway_type, 
                        event_data
                    )
                    
                    if error_details:
                        refund_request.processing_errors.append({
                            "error_code": error_details.get("code", "GATEWAY_ERROR"),
                            "error_message": error_details.get("message", "Unknown gateway error"),
                            "occurred_at": datetime.datetime.now().isoformat()
                        })
                    
                    self.refund_repository.update(refund_request)
                    
                    # Publish status change event
                    self._publish_status_change_event(
                        refund_request, 
                        previous_status, 
                        RefundStatus.FAILED
                    )
                    
                    # Send failure notification
                    error_message = error_details.get("message", "Unknown gateway error") if error_details else "Gateway processing failed"
                    self._send_failure_notification(refund_request, error_message)
            
            return True
            
        except Exception as e:
            logger.error(f"Error handling gateway webhook: {str(e)}", exc_info=True)
            return False

    def retry_failed_refund(self, refund_request_id: str, user_id: str) -> RefundRequest:
        """
        Retry a failed refund request.
        
        Args:
            refund_request_id: ID of the failed refund to retry
            user_id: ID of the user initiating the retry
            
        Returns:
            The updated RefundRequest object
            
        Raises:
            RefundNotFoundException: If the refund request doesn't exist
            RefundStateTransitionError: If the refund is not in a FAILED state
            InsufficientPermissionsError: If the user lacks retry permissions
        """
        logger.info(f"Retrying failed refund {refund_request_id}")
        
        # Get refund request
        refund_request = self.refund_repository.find_by_id(refund_request_id)
        if not refund_request:
            raise RefundNotFoundException(f"Refund request not found: {refund_request_id}")
        
        # Verify refund is in FAILED state
        if refund_request.status != RefundStatus.FAILED:
            raise RefundStateTransitionError(
                f"Cannot retry refund in state {refund_request.status}"
            )
        
        # Check permission to retry
        if not self._can_retry_refund(refund_request, user_id):
            raise InsufficientPermissionsError(
                f"User {user_id} does not have permission to retry refund {refund_request_id}"
            )
        
        try:
            # Reset to SUBMITTED state
            refund_request.status = RefundStatus.SUBMITTED
            refund_request.add_status_history(
                status=RefundStatus.SUBMITTED,
                changed_by=user_id,
                reason="Manual retry of failed refund"
            )
            self.refund_repository.update(refund_request)
            
            # Publish event for retry
            self._publish_status_change_event(
                refund_request, 
                RefundStatus.FAILED, 
                RefundStatus.SUBMITTED
            )
            
            # Process the refund again
            return self.process_refund_request(refund_request_id)
            
        except Exception as e:
            logger.error(f"Error retrying refund {refund_request_id}: {str(e)}", exc_info=True)
            raise

    # Private helper methods
    
    def _validate_transaction(self, transaction_id: str) -> Any:
        """
        Validates that a transaction exists and is eligible for refund.
        This is a placeholder - in a real implementation, this would call the Payment Service.
        
        Args:
            transaction_id: ID of the transaction to validate
            
        Returns:
            Transaction object if valid
            
        Raises:
            RefundValidationError: If the transaction is invalid or not eligible for refund
        """
        # This would call the Payment Service in a real implementation
        # For now, we'll return a mock transaction
        # In production, this would validate that the transaction:
        # 1. Exists
        # 2. Is in a completed state
        # 3. Has not been fully refunded already
        # 4. Is not expired for refunds
        
        if not transaction_id:
            raise RefundValidationError("Transaction ID is required")
            
        # Mock transaction for demonstration
        class MockTransaction:
            def __init__(self, transaction_id):
                self.transaction_id = transaction_id
                self.merchant_id = "merchant_12345"
                self.amount = Decimal("100.00")
                self.currency = "USD"
                self.status = "COMPLETED"
                self.payment_method = "VISA"
                self.payment_method_details = {
                    "card_last_four": "4242",
                    "card_network": "VISA"
                }
                self.customer_id = "customer_12345"
                self.processed_at = datetime.datetime.now() - datetime.timedelta(days=10)
        
        return MockTransaction(transaction_id)
    
    def _validate_refund_amount(self, amount: Decimal, transaction: Any) -> bool:
        """
        Validates that the refund amount is valid for the transaction.
        
        Args:
            amount: Refund amount
            transaction: Transaction object
            
        Returns:
            True if valid
            
        Raises:
            RefundValidationError: If the amount is invalid
        """
        if amount <= Decimal("0"):
            raise RefundValidationError("Refund amount must be positive")
            
        if amount > transaction.amount:
            raise RefundValidationError(
                f"Refund amount {amount} exceeds original transaction amount {transaction.amount}"
            )
        
        return True
    
    def _determine_refund_method(
        self, 
        transaction: Any, 
        requested_method: Optional[str] = None,
        bank_account_id: Optional[str] = None
    ) -> str:
        """
        Determines the appropriate refund method based on the transaction and request.
        
        Args:
            transaction: Transaction object
            requested_method: Requested refund method
            bank_account_id: Bank account ID for OTHER method
            
        Returns:
            Selected refund method
            
        Raises:
            RefundValidationError: If the requested method is invalid
        """
        valid_methods = ["ORIGINAL_PAYMENT", "BALANCE", "OTHER"]
        
        # If method specified, validate it
        if requested_method:
            if requested_method not in valid_methods:
                raise RefundValidationError(f"Invalid refund method: {requested_method}")
            
            # Validate OTHER method has bank account
            if requested_method == "OTHER" and not bank_account_id:
                raise RefundValidationError("Bank account ID is required for OTHER refund method")
            
            return requested_method
        
        # No method specified, determine automatically
        # In a real implementation, this would check if original payment method is available,
        # then fall back to balance, then to OTHER if configured
        return "ORIGINAL_PAYMENT"
    
    def _requires_approval(self, refund_request: RefundRequest) -> bool:
        """
        Determines if a refund request requires approval based on configured rules.
        
        Args:
            refund_request: Refund request to check
            
        Returns:
            True if approval is required, False otherwise
        """
        # Get approval threshold parameter for the merchant
        approval_threshold = self.parameter_service.resolve_parameter(
            "approvalThreshold",
            refund_request.merchant_id
        )
        
        # Check if amount exceeds threshold
        if refund_request.amount >= Decimal(str(approval_threshold)):
            return True
        
        # In a real implementation, additional rules would be checked here
        return False
    
    def _publish_status_change_event(
        self,
        refund_request: RefundRequest,
        old_status: str,
        new_status: str
    ) -> None:
        """
        Publishes an event for a refund status change.
        
        Args:
            refund_request: The refund request that changed
            old_status: Previous status
            new_status: New status
        """
        event_data = {
            "refund_request_id": refund_request.refund_request_id,
            "merchant_id": refund_request.merchant_id,
            "transaction_id": refund_request.transaction_id,
            "amount": str(refund_request.amount),
            "currency": refund_request.currency,
            "old_status": old_status,
            "new_status": new_status,
            "timestamp": datetime.datetime.now().isoformat()
        }
        
        self.event_publisher.publish_event(
            event_type="REFUND_STATUS_CHANGED",
            event_data=event_data
        )
    
    def _send_completion_notification(self, refund_request: RefundRequest, transaction: Any) -> None:
        """
        Sends a notification for a completed refund.
        
        Args:
            refund_request: The completed refund request
            transaction: The original transaction
        """
        # Get merchant and customer info
        merchant_name = self._get_merchant_name(refund_request.merchant_id)
        
        # Send to customer
        self.notification_service.send_notification(
            notification_type="REFUND_COMPLETED",
            recipient=transaction.customer_id,
            channel="EMAIL",
            context={
                "refund_request": refund_request,
                "transaction": transaction,
                "merchantName": merchant_name,
                "amount": refund_request.amount,
                "currency": refund_request.currency,
                "completionTime": refund_request.completed_at.isoformat() if refund_request.completed_at else datetime.datetime.now().isoformat()
            }
        )
        
        # Send to merchant admin
        self.notification_service.send_notification(
            notification_type="REFUND_COMPLETED",
            recipient=refund_request.merchant_id,  # In reality, this would be the merchant admin user ID
            channel="IN_APP",
            context={
                "refund_request": refund_request,
                "transaction": transaction,
                "amount": refund_request.amount,
                "currency": refund_request.currency,
                "completionTime": refund_request.completed_at.isoformat() if refund_request.completed_at else datetime.datetime.now().isoformat()
            }
        )
    
    def _send_failure_notification(self, refund_request: RefundRequest, error_message: str) -> None:
        """
        Sends a notification for a failed refund.
        
        Args:
            refund_request: The failed refund request
            error_message: Error message explaining the failure
        """
        # In a real implementation, this would include more context and be sent to 
        # appropriate recipients based on refund configuration
        
        self.notification_service.send_notification(
            notification_type="REFUND_FAILED",
            recipient=refund_request.merchant_id,  # In reality, this would be the merchant admin user ID
            channel="EMAIL",
            context={
                "refund_request": refund_request,
                "errorReason": error_message,
                "merchantName": self._get_merchant_name(refund_request.merchant_id),
                "amount": refund_request.amount,
                "currency": refund_request.currency
            }
        )
    
    def _send_rejection_notification(self, refund_request: RefundRequest, rejection_reason: Optional[str]) -> None:
        """
        Sends a notification for a rejected refund.
        
        Args:
            refund_request: The rejected refund request
            rejection_reason: Reason for rejection
        """
        self.notification_service.send_notification(
            notification_type="REFUND_REJECTED",
            recipient=refund_request.requestor_id,
            channel="EMAIL",
            context={
                "refund_request": refund_request,
                "rejectionReason": rejection_reason or "No reason provided",
                "merchantName": self._get_merchant_name(refund_request.merchant_id),
                "amount": refund_request.amount,
                "currency": refund_request.currency
            }
        )
    
    def _send_cancellation_notification(self, refund_request: RefundRequest, cancellation_reason: str) -> None:
        """
        Sends a notification for a cancelled refund.
        
        Args:
            refund_request: The cancelled refund request
            cancellation_reason: Reason for cancellation
        """
        self.notification_service.send_notification(
            notification_type="REFUND_CANCELLED",
            recipient=refund_request.requestor_id,
            channel="EMAIL",
            context={
                "refund_request": refund_request,
                "cancellationReason": cancellation_reason,
                "merchantName": self._get_merchant_name(refund_request.merchant_id),
                "amount": refund_request.amount,
                "currency": refund_request.currency
            }
        )
    
    def _get_merchant_name(self, merchant_id: str) -> str:
        """
        Gets the merchant name from the merchant ID.
        This is a placeholder - in a real implementation, this would call the Merchant Service.
        
        Args:
            merchant_id: Merchant ID
            
        Returns:
            Merchant name
        """
        # This would call the Merchant Service in a real implementation
        return "Example Merchant"
    
    def _can_cancel_refund(self, refund_request: RefundRequest, user_id: str) -> bool:
        """
        Checks if a user has permission to cancel a refund.
        This is a placeholder - in a real implementation, this would check permissions.
        
        Args:
            refund_request: Refund request to check
            user_id: User ID to check permissions for
            
        Returns:
            True if user can cancel the refund
        """
        # In a real implementation, this would check user roles and permissions
        # For simplicity, we'll allow the refund requestor to cancel it
        return refund_request.requestor_id == user_id
    
    def _can_retry_refund(self, refund_request: RefundRequest, user_id: str) -> bool:
        """
        Checks if a user has permission to retry a failed refund.
        This is a placeholder - in a real implementation, this would check permissions.
        
        Args:
            refund_request: Refund request to check
            user_id: User ID to check permissions for
            
        Returns:
            True if user can retry the refund
        """
        # In a real implementation, this would check user roles and permissions
        # For simplicity, we'll allow the refund requestor to retry it
        return refund_request.requestor_id == user_id