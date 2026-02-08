import { v4 as uuidv4 } from 'uuid';
import { useOperationStore } from '../../store/operationStore';
import { useUIStore } from '../../store/uiStore';
import { ErrorHandler, type ErrorOptions } from '../utils/errorHandler';

export interface ExecuteOperationOptions {
  operation: string;
  type: 'read' | 'write';
  partitionName: string;
  partitionSize?: string;
  operationId?: string;
  clearLogs?: boolean;
  openLogPanel?: boolean;
  successMessage?: string;
  handleSuccess?: boolean;
  successToast?: boolean;
  errorMessage?: string;
  errorOptions?: ErrorOptions;
  onStart?: (operationId: string) => void;
  run: (operationId: string) => Promise<void>;
}

export async function executeOperation(
  options: ExecuteOperationOptions
): Promise<{ operationId: string; success: boolean }> {
  const {
    operation,
    type,
    partitionName,
    partitionSize,
    operationId: providedOperationId,
    clearLogs = true,
    openLogPanel = true,
    successMessage,
    handleSuccess = true,
    successToast = true,
    errorMessage,
    errorOptions,
    onStart,
    run,
  } = options;

  const operationId = providedOperationId || uuidv4();
  const {
    startOperation,
    clearLogs: clearOperationLogs,
    finishOperation,
    setIsStreaming,
  } = useOperationStore.getState();
  const { openLogPanel: openLogPanelAction } = useUIStore.getState();

  if (clearLogs) {
    clearOperationLogs();
  }

  if (onStart) {
    onStart(operationId);
  }

  startOperation(type, partitionName, partitionSize, operationId);

  if (openLogPanel) {
    openLogPanelAction();
  }

  try {
    await run(operationId);
    if (handleSuccess) {
      ErrorHandler.success(operation, successMessage, successToast);
    }
    finishOperation(true);
    setIsStreaming(false);
    return { operationId, success: true };
  } catch (error: unknown) {
    ErrorHandler.handle(error, operation, {
      ...errorOptions,
      customMessage: errorMessage ?? errorOptions?.customMessage,
    });
    const errorDetail = error instanceof Error ? error.message : undefined;
    finishOperation(false, errorMessage || errorDetail);
    return { operationId, success: false };
  }
}
