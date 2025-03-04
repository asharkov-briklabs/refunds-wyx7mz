# Changelog

All notable changes to the Refunds Service will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Enhanced analytics dashboard with merchant-specific refund trends
- Support for cryptocurrency refunds
- Advanced fraud detection integration

## [1.1.0] - 2023-11-15

### Added
- Multi-language support for refund notifications
- Batch processing capability for bulk refunds
- Custom refund reason codes at merchant level

### Changed
- Improved performance of parameter resolution service
- Enhanced dashboard visualizations for refund metrics
- Upgraded Stripe integration to API version 2023-08-16

### Fixed
- Resolved issue with timeout during high-volume approval workflows
- Fixed incorrect currency conversion in cross-border refunds
- Addressed pagination issues in refund history endpoint

## [1.0.1] - 2023-09-28

### Fixed
- Resolved race condition in concurrent refund processing
- Fixed validation error messages for improved clarity
- Corrected timestamp handling in refund history records

### Security
- Enhanced encryption for bank account information
- Improved rate limiting for sensitive API endpoints

## [1.0.0] - 2023-09-01

### Added
- Initial release of Refunds Service
- Core refund processing capabilities
  - ORIGINAL_PAYMENT method support
  - BALANCE method support
  - OTHER method support with bank account management
- Configurable approval workflows with multi-level escalation
- Card network compliance rule enforcement
- Parameter resolution with hierarchical inheritance
- Comprehensive refund status tracking
- Merchant and admin interfaces (Pike and Barracuda)
- Integration with Stripe, Adyen, and Fiserv payment gateways
- Notification system for refund status updates
- Reporting and analytics dashboard
- Bank account verification and management

[Unreleased]: https://github.com/brikfinancial/refunds-service/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/brikfinancial/refunds-service/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/brikfinancial/refunds-service/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/brikfinancial/refunds-service/releases/tag/v1.0.0