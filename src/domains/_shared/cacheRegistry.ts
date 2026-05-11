type ServiceCacheCleaner = () => void;

const serviceCacheCleaners = new Set<ServiceCacheCleaner>();

export const registerServiceCacheCleaner = (cleaner: ServiceCacheCleaner): void => {
  serviceCacheCleaners.add(cleaner);
};

export const clearAllServiceCaches = (): void => {
  serviceCacheCleaners.forEach((cleaner) => {
    cleaner();
  });
};
