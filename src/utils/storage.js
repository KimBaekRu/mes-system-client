// localStorage 안전 사용 유틸리티 함수들
// 배포 환경에서도 안전하게 localStorage를 사용할 수 있도록 함

/**
 * localStorage에서 값을 안전하게 가져오는 함수
 * @param {string} key - localStorage 키
 * @param {string|null} defaultValue - 기본값
 * @returns {string|null} - 저장된 값 또는 기본값
 */
export function safeLocalStorageGetItem(key, defaultValue = null) {
  try {
    // SSR 환경 체크
    if (typeof window === 'undefined') {
      return defaultValue;
    }
    
    // localStorage 지원 여부 체크
    if (typeof Storage !== 'undefined' && localStorage) {
      return localStorage.getItem(key);
    }
  } catch (error) {
    console.warn(`localStorage.getItem("${key}") failed:`, error);
  }
  return defaultValue;
}

/**
 * localStorage에 값을 안전하게 저장하는 함수
 * @param {string} key - localStorage 키
 * @param {string} value - 저장할 값
 * @returns {boolean} - 성공 여부
 */
export function safeLocalStorageSetItem(key, value) {
  try {
    // SSR 환경 체크
    if (typeof window === 'undefined') {
      return false;
    }
    
    // localStorage 지원 여부 체크
    if (typeof Storage !== 'undefined' && localStorage) {
      localStorage.setItem(key, value);
      return true;
    }
  } catch (error) {
    console.warn(`localStorage.setItem("${key}", "${value}") failed:`, error);
    
    // 저장 공간 부족 시 오래된 데이터 정리 시도
    if (error.name === 'QuotaExceededError') {
      try {
        // 임시 데이터 정리 (예: 7일 이상 된 데이터)
        cleanOldLocalStorageData();
        localStorage.setItem(key, value);
        return true;
      } catch (retryError) {
        console.error('localStorage 정리 후 재시도 실패:', retryError);
      }
    }
  }
  return false;
}

/**
 * localStorage에서 값을 안전하게 삭제하는 함수
 * @param {string} key - localStorage 키
 * @returns {boolean} - 성공 여부
 */
export function safeLocalStorageRemoveItem(key) {
  try {
    // SSR 환경 체크
    if (typeof window === 'undefined') {
      return false;
    }
    
    // localStorage 지원 여부 체크
    if (typeof Storage !== 'undefined' && localStorage) {
      localStorage.removeItem(key);
      return true;
    }
  } catch (error) {
    console.warn(`localStorage.removeItem("${key}") failed:`, error);
  }
  return false;
}

/**
 * JSON 데이터를 안전하게 localStorage에서 파싱하는 함수
 * @param {string} key - localStorage 키
 * @param {any} defaultValue - 기본값
 * @returns {any} - 파싱된 데이터 또는 기본값
 */
export function safeJSONParse(key, defaultValue = []) {
  try {
    const item = safeLocalStorageGetItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item);
  } catch (error) {
    console.warn(`JSON.parse for localStorage key "${key}" failed:`, error);
    return defaultValue;
  }
}

/**
 * JSON 데이터를 안전하게 localStorage에 저장하는 함수
 * @param {string} key - localStorage 키
 * @param {any} data - 저장할 데이터
 * @returns {boolean} - 성공 여부
 */
export function safeJSONStringify(key, data) {
  try {
    const jsonString = JSON.stringify(data);
    return safeLocalStorageSetItem(key, jsonString);
  } catch (error) {
    console.warn(`JSON.stringify for localStorage key "${key}" failed:`, error);
    return false;
  }
}

/**
 * localStorage의 오래된 데이터를 정리하는 함수
 */
function cleanOldLocalStorageData() {
  try {
    if (typeof window === 'undefined' || !localStorage) return;

    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000); // 7일 전
    
    // localStorage의 모든 키를 확인
    const keysToRemove = [];
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      // 히스토리 데이터 중 오래된 것들 정리
      if (key.includes('_history_') || key.includes('_maintenance_') || key.includes('_downtime_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(data)) {
            // 배열 데이터에서 오래된 항목 필터링
            const filteredData = data.filter(item => {
              if (item.timestamp) {
                return new Date(item.timestamp).getTime() > sevenDaysAgo;
              }
              return true; // timestamp가 없는 데이터는 유지
            });
            
            if (filteredData.length !== data.length) {
              localStorage.setItem(key, JSON.stringify(filteredData));
            }
          }
        } catch (parseError) {
          // 파싱 실패한 키는 삭제 대상에 추가
          keysToRemove.push(key);
        }
      }
    }
    
    // 파싱 실패한 키들 삭제
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
  } catch (error) {
    console.warn('localStorage 정리 중 오류:', error);
  }
}

/**
 * localStorage 사용 가능 여부 체크
 * @returns {boolean} - 사용 가능 여부
 */
export function isLocalStorageAvailable() {
  try {
    if (typeof window === 'undefined') return false;
    if (typeof Storage === 'undefined' || !localStorage) return false;
    
    // 실제 쓰기/읽기 테스트
    const testKey = '__localStorage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * localStorage 사용량 정보 조회
 * @returns {object} - 사용량 정보
 */
export function getLocalStorageUsage() {
  try {
    if (!isLocalStorageAvailable()) {
      return { available: false };
    }
    
    let totalSize = 0;
    let itemCount = 0;
    
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length + key.length;
        itemCount++;
      }
    }
    
    // 대략적인 사용률 계산 (일반적으로 5-10MB가 한계)
    const estimatedLimit = 5 * 1024 * 1024; // 5MB
    const usagePercent = Math.round((totalSize / estimatedLimit) * 100);
    
    return {
      available: true,
      totalSize,
      itemCount,
      usagePercent,
      estimatedLimit
    };
  } catch (error) {
    return { available: false, error: error.message };
  }
}