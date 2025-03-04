/**
 * Parameter Value Model
 * 
 * Defines the ParameterValue model that represents a configured parameter value at a specific level 
 * (merchant, organization, program, bank) in the parameter hierarchy. This model is central to the 
 * Parameter Resolution Service's ability to manage hierarchical configuration values.
 */

/**
 * Enumeration of entity types in the parameter hierarchy
 */
export enum ParameterEntityType {
    MERCHANT = 'MERCHANT',
    ORGANIZATION = 'ORGANIZATION',
    PROGRAM = 'PROGRAM',
    BANK = 'BANK'
}

/**
 * Enumeration of inheritance levels with numeric values for priority ordering
 */
export enum ParameterInheritanceLevel {
    MERCHANT = 1,
    ORGANIZATION = 2,
    PROGRAM = 3,
    BANK = 4,
    DEFAULT = 5
}

/**
 * Interface for initializing parameter values
 */
export interface IParameterValueInit {
    id: string;
    entityType: string;
    entityId: string;
    parameterName: string;
    value: any;
    effectiveDate: Date | string;
    expirationDate?: Date | string | null;
    overridden?: boolean;
    version?: number;
    createdBy: string;
    createdAt: Date | string;
    updatedAt: Date | string;
}

/**
 * Interface defining parameter validation results
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

/**
 * Represents a configured parameter value at a specific level in the parameter hierarchy
 */
class ParameterValue {
    id: string;
    entityType: string;
    entityId: string;
    parameterName: string;
    value: any;
    effectiveDate: Date;
    expirationDate: Date | null;
    overridden: boolean;
    version: number;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;

    /**
     * Creates a new parameter value instance
     * @param data Initialization data for parameter value
     */
    constructor(data: IParameterValueInit) {
        this.id = data.id;
        this.entityType = data.entityType;
        this.entityId = data.entityId;
        this.parameterName = data.parameterName;
        this.value = data.value;
        
        // Ensure dates are properly parsed if provided as strings
        this.effectiveDate = data.effectiveDate instanceof Date 
            ? data.effectiveDate 
            : new Date(data.effectiveDate);
        
        this.expirationDate = data.expirationDate 
            ? (data.expirationDate instanceof Date 
                ? data.expirationDate 
                : new Date(data.expirationDate)) 
            : null;
        
        // Set default values for optional properties
        this.overridden = data.overridden !== undefined ? data.overridden : false;
        this.version = data.version !== undefined ? data.version : 1;
        
        this.createdBy = data.createdBy;
        this.createdAt = data.createdAt instanceof Date 
            ? data.createdAt 
            : new Date(data.createdAt);
        this.updatedAt = data.updatedAt instanceof Date 
            ? data.updatedAt 
            : new Date(data.updatedAt);
    }

    /**
     * Checks if the parameter value is currently active based on effective and expiration dates
     * @returns True if the parameter is active, false otherwise
     */
    isActive(): boolean {
        const currentDate = new Date();
        
        // Check if current date is after or equal to effectiveDate
        const isEffective = currentDate >= this.effectiveDate;
        
        // Check if expirationDate is null or current date is before expirationDate
        const isNotExpired = this.expirationDate === null || currentDate < this.expirationDate;
        
        // Return true if both conditions are met
        return isEffective && isNotExpired;
    }

    /**
     * Serializes the parameter value to a plain object
     * @returns Serialized parameter value object
     */
    toJSON(): object {
        return {
            id: this.id,
            entityType: this.entityType,
            entityId: this.entityId,
            parameterName: this.parameterName,
            value: this.value,
            effectiveDate: this.effectiveDate.toISOString(),
            expirationDate: this.expirationDate ? this.expirationDate.toISOString() : null,
            overridden: this.overridden,
            version: this.version,
            createdBy: this.createdBy,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString()
        };
    }
}

export default ParameterValue;