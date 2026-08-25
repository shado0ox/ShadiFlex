import { IAccountingRepository } from '../repositories/AccountingRepository';
import { LocalStorageAccountingRepository } from '../repositories/LocalStorageAccountingRepository';
import { IS_DEMO_MODE } from '../config/appConfig';

/**
 * Data Service Factory
 *
 * Provides the active repository instance based on current application configuration.
 * In Demo Mode, it provides LocalStorageAccountingRepository.
 * When switching to a real API/database backend in the future, this service will provide
 * the API-backed repository implementation.
 */
class DataService {
  private repository: IAccountingRepository;

  constructor() {
    // Currently using LocalStorage repository for Demo/Preview mode
    this.repository = LocalStorageAccountingRepository.getInstance();
  }

  public getRepository(): IAccountingRepository {
    return this.repository;
  }

  public isDemoMode(): boolean {
    return IS_DEMO_MODE;
  }
}

export const dataService = new DataService();
export const getAccountingRepository = (): IAccountingRepository => dataService.getRepository();
