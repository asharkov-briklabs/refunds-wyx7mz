import { useCallback } from 'react'; // react ^18.2.0
import { useState, useEffect } from 'react'; // react ^18.2.0
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { 
  fetchParametersThunk,
  getParameterByNameThunk,
  createParameterThunk,
  updateParameterThunk,
  deleteParameterThunk,
  getParameterInheritanceThunk,
  getParameterDefinitionsThunk,
  resolveParameterThunk,
  selectParameters,
  selectParameterDefinitions,
  selectCurrentParameter,
  selectParameterInheritance,
  selectResolvedParameter,
  selectParameterLoading,
  selectParameterError,
  selectTotalParameters,
  parameterActions
} from '../store/slices/parameter.slice';
import { 
  Parameter, 
  ParameterDefinition, 
  ParameterCreateRequest, 
  ParameterUpdateRequest,
  ParameterListParams,
  ParameterInheritanceList,
  ResolvedParameter,
  EntityType
} from '../types/parameter.types';

/**
 * Hook that provides access to parameter management functionality
 * @returns {object} Object containing parameter state and methods for parameter operations
 */
const useParameter = () => {
  // LD1: Initialize dispatch and selector hooks from Redux
  const dispatch = useAppDispatch();
  
  // LD1: Select parameter state from the Redux store using selectors
  const parameters = useAppSelector(selectParameters);
  const parameterDefinitions = useAppSelector(selectParameterDefinitions);
  const currentParameter = useAppSelector(selectCurrentParameter);
  const parameterInheritance = useAppSelector(selectParameterInheritance);
  const resolvedParameter = useAppSelector(selectResolvedParameter);
  const loading = useAppSelector(selectParameterLoading);
  const error = useAppSelector(selectParameterError);
  const totalItems = useAppSelector(selectTotalParameters);

  // LD1: Implement fetchParameters function to get parameters with filtering
  const fetchParameters = useCallback((params: ParameterListParams) => {
    // IE1: Dispatch the fetchParametersThunk with the provided parameters
    dispatch(fetchParametersThunk(params));
  }, [dispatch]);

  // LD1: Implement getParameterByName function to get a specific parameter
  const getParameterByName = useCallback((parameterName: string, entityType: EntityType, entityId: string) => {
    // IE1: Dispatch the getParameterByNameThunk with the provided parameters
    dispatch(getParameterByNameThunk({ parameterName, entityType, entityId }));
  }, [dispatch]);

  // LD1: Implement createParameter function to create a new parameter
  const createParameter = useCallback((request: ParameterCreateRequest) => {
    // IE1: Dispatch the createParameterThunk with the provided request
    dispatch(createParameterThunk(request));
  }, [dispatch]);

  // LD1: Implement updateParameter function to update an existing parameter
  const updateParameter = useCallback((parameterName: string, entityType: EntityType, entityId: string, request: ParameterUpdateRequest) => {
    // IE1: Dispatch the updateParameterThunk with the provided parameters
    dispatch(updateParameterThunk({ parameterName, entityType, entityId, request }));
  }, [dispatch]);

  // LD1: Implement deleteParameter function to delete a parameter
  const deleteParameter = useCallback((parameterName: string, entityType: EntityType, entityId: string) => {
    // IE1: Dispatch the deleteParameterThunk with the provided parameters
    dispatch(deleteParameterThunk({ parameterName, entityType, entityId }));
  }, [dispatch]);

  // LD1: Implement getParameterInheritance function to get inheritance chain
  const getParameterInheritance = useCallback((entityType: EntityType, entityId: string) => {
    // IE1: Dispatch the getParameterInheritanceThunk with the provided parameters
    dispatch(getParameterInheritanceThunk({ entityType, entityId }));
  }, [dispatch]);

  // LD1: Implement getParameterDefinitions function to get parameter definitions
  const getParameterDefinitions = useCallback(() => {
    // IE1: Dispatch the getParameterDefinitionsThunk
    dispatch(getParameterDefinitionsThunk());
  }, [dispatch]);

    // LD1: Implement resolveParameter function to resolve a parameter with inheritance
    const resolveParameter = useCallback((parameterName: string, entityType: EntityType, entityId: string) => {
        // IE1: Dispatch the resolveParameterThunk with the provided parameters
        dispatch(resolveParameterThunk({ parameterName, entityType, entityId }));
    }, [dispatch]);

  // LD1: Implement clearParameterState function to reset the state
  const clearParameterState = useCallback(() => {
    // IE1: Dispatch the clearParameterState action
    dispatch(parameterActions.clearParameterState());
  }, [dispatch]);

  // LD1: Return an object with all parameter data and operation functions
  return {
    parameters,
    parameterDefinitions,
    currentParameter,
    parameterInheritance,
    resolvedParameter,
    loading,
    error,
    totalItems,
    fetchParameters,
    getParameterByName,
    createParameter,
    updateParameter,
    deleteParameter,
    getParameterInheritance,
    getParameterDefinitions,
    resolveParameter,
    clearParameterState
  };
};

export default useParameter;