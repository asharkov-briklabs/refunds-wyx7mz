import { RefundStatus } from '../../../common/enums/refund-status.enum';
import { BusinessError } from '../../../common/errors/business-error';

/**
 * Configuration object defining the state machine for refund requests.
 * For each status, defines the allowed transitions and whether it's a terminal state.
 * 
 * This state machine ensures that refunds follow a consistent and valid path through
 * their lifecycle from creation to completion, enforcing business rules about allowed
 * state transitions.
 */
export const STATE_MACHINE_CONFIG: Record<RefundStatus, {
  allowedTransitions: RefundStatus[],
  terminal: boolean
}> = {
  [RefundStatus.DRAFT]: {
    allowedTransitions: [
      RefundStatus.SUBMITTED,
      RefundStatus.CANCELED
    ],
    terminal: false
  },
  [RefundStatus.SUBMITTED]: {
    allowedTransitions: [
      RefundStatus.VALIDATION_FAILED,
      RefundStatus.PENDING_APPROVAL,
      RefundStatus.PROCESSING,
      RefundStatus.CANCELED
    ],
    terminal: false
  },
  [RefundStatus.VALIDATION_FAILED]: {
    allowedTransitions: [],
    terminal: true
  },
  [RefundStatus.PENDING_APPROVAL]: {
    allowedTransitions: [
      RefundStatus.REJECTED,
      RefundStatus.PROCESSING,
      RefundStatus.CANCELED
    ],
    terminal: false
  },
  [RefundStatus.PROCESSING]: {
    allowedTransitions: [
      RefundStatus.GATEWAY_PENDING,
      RefundStatus.COMPLETED,
      RefundStatus.FAILED
    ],
    terminal: false
  },
  [RefundStatus.GATEWAY_PENDING]: {
    allowedTransitions: [
      RefundStatus.COMPLETED,
      RefundStatus.GATEWAY_ERROR
    ],
    terminal: false
  },
  [RefundStatus.GATEWAY_ERROR]: {
    allowedTransitions: [
      RefundStatus.GATEWAY_PENDING,
      RefundStatus.FAILED
    ],
    terminal: false
  },
  [RefundStatus.COMPLETED]: {
    allowedTransitions: [],
    terminal: true
  },
  [RefundStatus.FAILED]: {
    allowedTransitions: [],
    terminal: true
  },
  [RefundStatus.REJECTED]: {
    allowedTransitions: [],
    terminal: true
  },
  [RefundStatus.CANCELED]: {
    allowedTransitions: [],
    terminal: true
  }
};

/**
 * Validates whether a state transition is allowed according to the state machine configuration.
 * 
 * @param currentState - The current state of the refund
 * @param newState - The proposed new state
 * @returns True if the transition is valid, false otherwise
 */
export function validateStateTransition(currentState: RefundStatus, newState: RefundStatus): boolean {
  // Check if current state exists in the state machine config
  if (!(currentState in STATE_MACHINE_CONFIG)) {
    // Return false for unknown states
    return false;
  }
  
  // Get allowed transitions for the current state
  const { allowedTransitions } = STATE_MACHINE_CONFIG[currentState];
  
  // Check if new state is in the list of allowed transitions
  return allowedTransitions.includes(newState);
}

/**
 * Executes a state transition with validation, throwing an error if the transition is invalid.
 * 
 * @param currentState - The current state of the refund
 * @param newState - The proposed new state
 * @returns The new state if the transition is valid
 * @throws BusinessError if the transition is invalid
 */
export function executeStateTransition(currentState: RefundStatus, newState: RefundStatus): RefundStatus {
  // If transitioning to the same state, just return it (no-op)
  if (currentState === newState) {
    return currentState;
  }
  
  // Check if the transition is valid according to our state machine
  if (!validateStateTransition(currentState, newState)) {
    // If the current state is unknown, provide a specific error message
    if (!(currentState in STATE_MACHINE_CONFIG)) {
      throw BusinessError.createRuleViolationError(
        'InvalidState',
        `Unknown refund state: ${currentState}`,
        'Ensure the refund is in a valid state before attempting a transition.',
        { currentState, newState }
      );
    }
    
    // If the transition is invalid, throw a business rule violation error
    throw BusinessError.createRuleViolationError(
      'InvalidStateTransition',
      `Invalid state transition from ${currentState} to ${newState}`,
      `Check the refund status and ensure the requested transition is valid. Valid transitions from ${currentState} are: ${STATE_MACHINE_CONFIG[currentState].allowedTransitions.join(', ') || 'none'}.`,
      {
        currentState,
        newState,
        allowedTransitions: STATE_MACHINE_CONFIG[currentState].allowedTransitions
      }
    );
  }
  
  return newState;
}

/**
 * Checks if a refund status is a terminal (final) state.
 * Terminal states are those from which no further transitions are allowed.
 * 
 * @param state - The refund status to check
 * @returns True if the state is terminal, false otherwise
 */
export function isTerminalState(state: RefundStatus): boolean {
  if (!(state in STATE_MACHINE_CONFIG)) {
    return false;
  }
  
  return STATE_MACHINE_CONFIG[state].terminal;
}

/**
 * Gets all available transitions from the current state.
 * 
 * @param currentState - The current state of the refund
 * @returns Array of allowed next states
 */
export function getAvailableTransitions(currentState: RefundStatus): RefundStatus[] {
  if (!(currentState in STATE_MACHINE_CONFIG)) {
    return [];
  }
  
  return [...STATE_MACHINE_CONFIG[currentState].allowedTransitions];
}

/**
 * Determines the appropriate next state based on conditions and the current state.
 * This function encapsulates business logic for state transitions based on various conditions.
 * 
 * @param currentState - The current state of the refund
 * @param conditions - Object containing conditions that affect the next state determination
 * @param conditions.requiresApproval - Whether the refund requires approval
 * @param conditions.approvalGranted - Whether approval was granted (true), denied (false), or pending (undefined)
 * @param conditions.validationPassed - Whether validation passed (true), failed (false), or not performed (undefined)
 * @param conditions.gatewaySuccess - Whether gateway processing succeeded (true), failed (false), or not attempted (undefined)
 * @param conditions.gatewayErrorRetryable - Whether a gateway error can be retried
 * @param conditions.maxRetriesExceeded - Whether the maximum number of retries has been exceeded
 * @returns The recommended next state based on conditions
 * @throws BusinessError if the determined transition is invalid
 */
export function getNextState(
  currentState: RefundStatus, 
  conditions: {
    requiresApproval?: boolean;
    approvalGranted?: boolean;
    validationPassed?: boolean;
    gatewaySuccess?: boolean;
    gatewayErrorRetryable?: boolean;
    maxRetriesExceeded?: boolean;
    [key: string]: any;
  }
): RefundStatus {
  // If current state is unknown or not in the state machine, return current state
  if (!(currentState in STATE_MACHINE_CONFIG)) {
    return currentState;
  }
  
  // If current state is terminal, no transitions are possible
  if (STATE_MACHINE_CONFIG[currentState].terminal) {
    return currentState;
  }
  
  let nextState: RefundStatus;
  
  switch (currentState) {
    case RefundStatus.DRAFT:
      // From DRAFT, we always go to SUBMITTED
      nextState = RefundStatus.SUBMITTED;
      break;
      
    case RefundStatus.SUBMITTED:
      // Determine next state based on validation and approval requirements
      if (conditions.validationPassed === false) {
        nextState = RefundStatus.VALIDATION_FAILED;
      } else if (conditions.requiresApproval) {
        nextState = RefundStatus.PENDING_APPROVAL;
      } else {
        nextState = RefundStatus.PROCESSING;
      }
      break;
      
    case RefundStatus.PENDING_APPROVAL:
      // Determine next state based on approval decision
      if (conditions.approvalGranted === true) {
        nextState = RefundStatus.PROCESSING;
      } else if (conditions.approvalGranted === false) {
        nextState = RefundStatus.REJECTED;
      } else {
        // If approval state is not specified, stay in current state
        return currentState;
      }
      break;
      
    case RefundStatus.PROCESSING:
      // Determine next state based on processing conditions
      if (conditions.gatewaySuccess === true) {
        nextState = RefundStatus.COMPLETED;
      } else if (conditions.gatewaySuccess === false) {
        nextState = RefundStatus.FAILED;
      } else {
        // Default to gateway pending if no specific condition
        nextState = RefundStatus.GATEWAY_PENDING;
      }
      break;
      
    case RefundStatus.GATEWAY_PENDING:
      // Determine next state based on gateway response
      if (conditions.gatewaySuccess === true) {
        nextState = RefundStatus.COMPLETED;
      } else {
        nextState = RefundStatus.GATEWAY_ERROR;
      }
      break;
      
    case RefundStatus.GATEWAY_ERROR:
      // Determine next state based on retry logic
      if (conditions.maxRetriesExceeded) {
        nextState = RefundStatus.FAILED;
      } else if (conditions.gatewayErrorRetryable !== false) {
        nextState = RefundStatus.GATEWAY_PENDING;
      } else {
        nextState = RefundStatus.FAILED;
      }
      break;
      
    default:
      // If state is not specifically handled, return current state
      return currentState;
  }
  
  // Validate that the determined next state is actually valid
  if (!validateStateTransition(currentState, nextState)) {
    throw BusinessError.createRuleViolationError(
      'InvalidStateTransition',
      `Invalid state transition from ${currentState} to ${nextState} based on conditions`,
      `The conditions provided resulted in an invalid state transition. Please check the conditions and state machine rules.`,
      {
        currentState,
        nextState,
        conditions,
        allowedTransitions: STATE_MACHINE_CONFIG[currentState].allowedTransitions
      }
    );
  }
  
  return nextState;
}