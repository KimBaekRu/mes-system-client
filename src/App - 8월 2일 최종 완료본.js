import React, { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Draggable from 'react-draggable';
import io from 'socket.io-client';

const DATA_FILE = 'data/equipments.json';

// 공정별 시간 분석 함수 (8시간 근무 기준)
function analyzeProcessTime(processTitle, currentTeam) {
  const WORK_HOURS = 8 * 60; // 8시간을 분으로 변환
  
  // 현재 조의 정비 이력 가져오기
  const maintKey = `process_${processTitle.id}_maintenance_${currentTeam}`;
  const maintenanceHistory = JSON.parse(localStorage.getItem(maintKey) || '[]');
  
  // 정비시간 집계
  const totalMaintTime = maintenanceHistory.reduce((total, maint) => {
    if (typeof maint.time === 'number' && !isNaN(maint.time)) {
      return total + maint.time;
    }
    return total;
  }, 0);
  
  // 현재 조의 비가동 이력 가져오기
  const downKey = `process_${processTitle.id}_downtime_${currentTeam}`;
  const downtimeHistory = JSON.parse(localStorage.getItem(downKey) || '[]');
  
  // 비가동시간 집계
  const totalDownTime = downtimeHistory.reduce((total, down) => {
    if (typeof down.time === 'number' && !isNaN(down.time)) {
      return total + down.time;
    }
    return total;
  }, 0);
  
  // TODO: 가동시간 데이터는 추후 추가
  const operatingTime = 0; // 가동시간 (아직 구현 안됨)
  
  // 남은 시간 계산 (8시간 - 정비시간 - 가동시간 - 비가동시간)
  const usedTime = totalMaintTime + operatingTime + totalDownTime;
  const remainingTime = Math.max(0, WORK_HOURS - usedTime);
  
  return {
    processTitle: processTitle.title,
    processId: processTitle.id,
    maintTime: totalMaintTime,
    operatingTime,
    downTime: totalDownTime,
    remainingTime,
    totalWorkHours: WORK_HOURS,
    team: currentTeam
  };
}

// 장비명 추출 함수
function extractEquipmentName(title) {
  if (!title) return 'Unknown';
  const equipmentName = title.split(/[-\s\d]/)[0].trim().toUpperCase();
  return equipmentName || title.toUpperCase();
}

// 장비명별 색상 매핑 (충돌 없는 직접 매핑 + 은은한 색상)
function getEquipmentColor(equipmentName) {
  const colorMap = {
    'C/A': '#5DADEC',      
    'CCM': '#D28B68',      
    'CSP': '#EEE8AA',      
    'D/S': '#F8B878',      
    'DFX': '#B0C4DE',      
    'L/G': '#D3D3D3',      
    'STRIP': '#FFDFBA',    
    'JIG': '#FFB3E6',      
    'BTB': '#B3E5D1',      
    '3RD': '#D46A6A',      
    'DEFAULT': '#D3D3D3'   
  };
  
  return colorMap[equipmentName] || colorMap['DEFAULT'];
}

// 순수 SVG 도넛 차트 컴포넌트 (라이브러리 없이!)
function ProcessTimeChart({ processData }) {
  const { processTitle, maintTime, operatingTime, downTime, remainingTime } = processData;
  const equipmentName = extractEquipmentName(processTitle);
  const processColor = getEquipmentColor(equipmentName);
  
  const totalTime = 480; // 8시간 = 480분
  const radius = 70;
  const strokeWidth = 16;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  
  const totalMinutes = maintTime + operatingTime + downTime;
  const totalHours = Math.floor(totalMinutes / 60);
  const totalMins = totalMinutes % 60;
  
  // 각 구간의 퍼센트 계산
  const maintPercent = (maintTime / totalTime) * 100;
  const operatingPercent = (operatingTime / totalTime) * 100;
  const downPercent = (downTime / totalTime) * 100;
  const remainingPercent = (remainingTime / totalTime) * 100;
  
  return (
    <div style={{
      background: `linear-gradient(135deg, ${processColor} 0%, ${processColor}dd 100%)`,
      borderRadius: '12px',
      padding: '20px',
      margin: '10px',
      boxShadow: `0 8px 32px ${processColor}50`,
      border: `2px solid ${processColor}`,
      minWidth: '280px',
    }}>
      {/* 헤더 */}
      <div style={{
        textAlign: 'center',
        marginBottom: '15px',
        color: 'white'
      }}>
        <h3 style={{ 
          margin: '0 0 5px 0', 
          fontSize: '20px', 
          fontWeight: '700'
        }}>
           {processTitle}
        </h3>
        <p style={{
          margin: 0,
          fontSize: '17px',
          opacity: 0.8
        }}>
          Downtime data : {totalHours}시간 {totalMins}분
        </p>
      </div>
      
      {/* 순수 SVG 도넛 차트 */}
      <div style={{ 
        height: '180px', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        position: 'relative'
      }}>
        <svg width="160" height="160" viewBox="0 0 160 160">
          {/* 배경 원 - 가동시간 (초록색) */}
          <circle
            cx="80"
            cy="80"
            r={normalizedRadius}
            stroke="#4CAF50"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          
          {/* 정비시간 (빨간색) */}
          {maintTime > 0 && (
            <circle
              cx="80"
              cy="80"
              r={normalizedRadius}
              stroke="#FF6B6B"
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={`${(maintTime / totalTime) * circumference} ${circumference}`}
              strokeDashoffset="0"
              strokeLinecap="round"
              transform="rotate(-90 80 80)"
            />
          )}
          
          {/* 가동시간 (청록색) */}
          {operatingTime > 0 && (
            <circle
              cx="80"
              cy="80"
              r={normalizedRadius}
              stroke="#4ECDC4"
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={`${(operatingTime / totalTime) * circumference} ${circumference}`}
              strokeDashoffset={`-${(maintTime / totalTime) * circumference}`}
              strokeLinecap="round"
              transform="rotate(-90 80 80)"
            />
          )}
          
          {/* 비가동시간 (노란색) */}
          {downTime > 0 && (
            <circle
              cx="80"
              cy="80"
              r={normalizedRadius}
              stroke="#FFE66D"
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={`${(downTime / totalTime) * circumference} ${circumference}`}
              strokeDashoffset={`-${((maintTime + operatingTime) / totalTime) * circumference}`}
              strokeLinecap="round"
              transform="rotate(-90 80 80)"
            />
          )}
          
          {/* 중앙 텍스트 */}
          <text
            x="80"
            y="75"
            textAnchor="middle"
            style={{
              fill: 'white',
              fontSize: '15px',
              fontWeight: 'bold'
            }}
          >
            {remainingPercent.toFixed(1)}%
          </text>
          <text
            x="80"
            y="90"
            textAnchor="middle"
            style={{
              fill: 'rgba(255,255,255,0.8)',
              fontSize: '12px'
            }}
          >
            가동률
          </text>
        </svg>
      </div>
      
      {/* 범례 */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '15px',
        marginBottom: '15px',
        fontSize: '11px',
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#FF6B6B', borderRadius: '50%' }}></div>
          <span>정비</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#4ECDC4', borderRadius: '50%' }}></div>
          <span>가동</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#FFE66D', borderRadius: '50%' }}></div>
          <span>비가동</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '12px', height: '12px', backgroundColor: '#4CAF50', borderRadius: '50%' }}></div>
          <span>가동시간</span>
        </div>
      </div>
      
      {/* 상세 정보 */}
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '8px',
        padding: '12px',
        fontSize: '11px',
        color: 'white'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span> 정비: {Math.floor(maintTime/60)}h {maintTime%60}m</span>
          <span>{maintPercent.toFixed(1)}%</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span> 가동: {Math.floor(operatingTime/60)}h {operatingTime%60}m</span>
          <span>{operatingPercent.toFixed(1)}%</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span> 비가동: {Math.floor(downTime/60)}h {downTime%60}m</span>
          <span>{downPercent.toFixed(1)}%</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '5px', marginTop: '5px' }}>
          <span> 가동시간: {Math.floor(remainingTime/60)}h {remainingTime%60}m</span>
          <span>{remainingPercent.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}

const socket = io('http://localhost:3001');

// 🔥 동적 위치 조정 컴포넌트 (생산량 창이 화면 밖으로 나가지 않도록)
const DynamicPositionWrapper = React.forwardRef(({ processRect, scrollX, scrollY, inputBlocksCount, style, children, ...props }, ref) => {
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const wrapperRef = useRef(null);

  // 위치 계산 함수
  const calculatePosition = useCallback(() => {
    if (!wrapperRef.current || !processRect) return;

    const element = wrapperRef.current;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // 실제 요소 크기 측정
    const elementRect = element.getBoundingClientRect();
    const popupWidth = elementRect.width || 600; // 기본값 600
    const popupHeight = elementRect.height || 400; // 기본값 400
    
    let left = processRect.left + scrollX;
    let top = processRect.bottom + scrollY + 5;
    
    // 우측 경계 체크 - 화면 밖으로 나가면 왼쪽으로 이동
    if (left + popupWidth > windowWidth + scrollX) {
      left = windowWidth + scrollX - popupWidth - 20; // 20px 여유 공간
    }
    
    // 좌측 경계 체크 - 화면 왼쪽으로 나가면 최소 위치로 이동
    if (left < scrollX) {
      left = scrollX + 20; // 20px 여유 공간
    }
    
    // 하단 경계 체크 - 화면 아래로 나가면 위쪽으로 이동
    if (top + popupHeight > windowHeight + scrollY) {
      top = processRect.top + scrollY - popupHeight - 5; // 노드 위쪽에 표시
    }
    
    // 상단 경계 체크 - 화면 위로 나가면 최소 위치로 이동
    if (top < scrollY) {
      top = scrollY + 20; // 20px 여유 공간
    }

    setPosition({ left, top });
  }, [processRect, scrollX, scrollY]);

  // 초기 위치 계산 및 블록 개수 변경시 재계산
  useEffect(() => {
    // 약간의 지연을 두고 계산 (DOM 업데이트 후)
    const timer = setTimeout(calculatePosition, 10);
    return () => clearTimeout(timer);
  }, [calculatePosition, inputBlocksCount]);

  // 창 크기 변경시 재계산
  useEffect(() => {
    const handleResize = () => calculatePosition();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculatePosition]);

  return (
    <div
      ref={(node) => {
        wrapperRef.current = node;
        if (ref) {
          if (typeof ref === 'function') ref(node);
          else ref.current = node;
        }
      }}
      style={{
        position: 'absolute',
        left: `${position.left}px`,
        top: `${position.top}px`,
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  );
});
// 공정명(타이틀) 노드 컴포넌트
function ProcessTitleNode({
  title, x, y, id, isAdmin, isEditMode, currentTeam, onMove, onEdit, onDelete, onClick,
  lineName, maintenanceHistory, onAddMaint, onDeleteMaint, showMaint, setShowMaint, zIndex, lastSaved: propLastSaved,
  yieldValue,
  secondValue,
  setYieldValue,
  setSecondValue,
  equipments
}) {
  const [edit, setEdit] = useState(false);
  const [value, setValue] = useState(title);
  useEffect(() => { setValue(title); }, [title]);
  
  const [lastSaved, setLastSaved] = useState(propLastSaved || null);
  useEffect(() => { setLastSaved(propLastSaved || null); }, [propLastSaved]);

  const [inputBlocks, setInputBlocks] = useState(() => {
    const saved = localStorage.getItem(`process_${id}_blocks_${currentTeam}`);
    if (saved) {
      const blocks = JSON.parse(saved);
      return blocks.map(b => ({
        ...b,
        maintStart: b.maintStart || '',
        maintEnd: b.maintEnd || '',
        maintDesc: b.maintDesc || '',
        maintEqNo: b.maintEqNo || '',
        downStart: b.downStart || '',
        downEnd: b.downEnd || '',
        downReason: b.downReason || ''
      }));
    }
        return [{
            id: Date.now(),
            yieldValue: yieldValue || '',
            secondValue: secondValue || '',
            maintStart: '',
            maintEnd: '',
            maintDesc: '',
            maintEqNo: '',
            downStart: '',
            downEnd: '',
            downReason: ''
          }];
  });

  const [openMaintInputIdx, setOpenMaintInputIdx] = useState(null);
  const [plusInputs, setPlusInputs] = useState({});

  // 조 전환시 해당 조의 데이터 로드
  useEffect(() => {
    const saved = localStorage.getItem(`process_${id}_blocks_${currentTeam}`);
    if (saved) {
      const blocks = JSON.parse(saved);
      setInputBlocks(blocks.map(b => ({
        ...b,
        maintStart: b.maintStart || '',
        maintEnd: b.maintEnd || '',
        maintDesc: b.maintDesc || '',
        maintEqNo: b.maintEqNo || ''
      })));
    } else {
      // 해당 조에 데이터가 없으면 기본 블록 생성
      setInputBlocks([{
        id: Date.now(),
        yieldValue: yieldValue || '',
        secondValue: secondValue || '',
        maintStart: '',
        maintEnd: '',
        maintDesc: '',
        maintEqNo: ''
      }]);
    }
    
    // 조 전환시 정비 이력 관련 상태 초기화
    setOpenMaintInputIdx(null);
    setPlusInputs({});
  }, [currentTeam, id, yieldValue, secondValue]);

  useEffect(() => {
    localStorage.setItem(`process_${id}_blocks_${currentTeam}`, JSON.stringify(inputBlocks));
  }, [inputBlocks, id, currentTeam]);
  
  const handleBlockChange = (index, field, val) => {
    setInputBlocks(blocks =>
      blocks.map((b, i) =>
        i === index ? { ...b, [field]: val } : b
      )
    );
  };

  const addBlock = () => {
    setInputBlocks(blocks => [
      ...blocks,
      {
        id: Date.now(),
        yieldValue: '',
        secondValue: '',
        maintStart: '',
        maintEnd: '',
        maintDesc: '',
        maintEqNo: ''
      }
    ]);
  };

  const removeBlock = (index) => {
    if (inputBlocks.length <= 1) {
      alert('마지막 입력창은 삭제할 수 없습니다.');
      return;
    }
    if (window.confirm('이 입력창을 삭제하시겠습니까?')) {
    setInputBlocks(blocks => blocks.filter((_, i) => i !== index));
    }
  };

  const addMaint = (index) => {
    const block = inputBlocks[index];
    if (!block.maintStart || !block.maintEnd || !block.maintDesc || !block.maintEqNo) {
      alert('⚠️ 모든 필드를 입력해주세요!\n- 시작시간 (예: 08:00)\n- 종료시간 (예: 10:30)\n- 장비번호 (정확한 장비명 입력)\n- 정비내용');
      return;
    }
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(block.maintStart) || !timeRegex.test(block.maintEnd)) {
      alert('시간을 HH:MM 형식으로 정확히 입력해주세요. (예: 08:00)');
      return;
    }
    const [sh, sm] = block.maintStart.split(':').map(Number);
    const [eh, em] = block.maintEnd.split(':').map(Number);
    let min = (eh - sh) * 60 + (em - sm);
    if (isNaN(min)) min = '';
    if (min < 0) min += 24 * 60;

    const newMaint = {
      time: min,
      description: `${block.maintStart}~${block.maintEnd} ${block.maintDesc}`,
      eqNo: block.maintEqNo,
      blockIndex: index,
    };
    onAddMaint(id, newMaint);
    
    // 메시지창 없이 바로 적용! (작업자들의 집중도 향상)
    
    handleBlockChange(index, 'maintStart', '');
    handleBlockChange(index, 'maintEnd', '');
    handleBlockChange(index, 'maintDesc', '');
    handleBlockChange(index, 'maintEqNo', '');
  };

  // 비가동 시간 추가 함수
  const addDowntime = (index) => {
    const block = inputBlocks[index];
    if (!block.downStart || !block.downEnd || !block.downReason) {
      alert('⚠️ 모든 필드를 입력해주세요!\n- 시작시간 (예: 08:00)\n- 종료시간 (예: 10:30)\n- 비가동 사유');
      return;
    }
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(block.downStart) || !timeRegex.test(block.downEnd)) {
      alert('시간을 HH:MM 형식으로 정확히 입력해주세요. (예: 08:00)');
      return;
    }
    const [sh, sm] = block.downStart.split(':').map(Number);
    const [eh, em] = block.downEnd.split(':').map(Number);
    let min = (eh - sh) * 60 + (em - sm);
    if (isNaN(min)) min = '';
    if (min < 0) min += 24 * 60;

    const newDowntime = {
      time: min,
      description: `${block.downStart}~${block.downEnd} ${block.downReason}`,
      reason: block.downReason,
      blockIndex: index,
    };
    
    // 비가동 이력을 localStorage에 저장
    const downKey = `process_${id}_downtime_${currentTeam}`;
    const existingDowntime = JSON.parse(localStorage.getItem(downKey) || '[]');
    const newDowntimeHistory = [...existingDowntime, newDowntime];
    localStorage.setItem(downKey, JSON.stringify(newDowntimeHistory));
    
    // 차트 업데이트를 위한 새로고침 트리거 (상위 컴포넌트에서 전달받아야 함)
    if (window.setChartRefresh) {
      window.setChartRefresh(prev => prev + 1);
    }
    
    // 입력 필드 초기화
    handleBlockChange(index, 'downStart', '');
    handleBlockChange(index, 'downEnd', '');
    handleBlockChange(index, 'downReason', '');
  };

  const handleSaveYield = (index) => {
    if (!window.confirm('저장하시겠습니까?')) return;
    const blockToSave = inputBlocks[index];
    const now = new Date();
    const lastSavedStr = now.toLocaleString('ko-KR', { hour12: false });

    // 🔥 개선: 각 블록에 타임스탬프 추가
    const updatedBlock = {
      ...blockToSave,
      savedAt: now.toISOString(),
      savedAtFormatted: lastSavedStr
    };
    
    // 블록 데이터 업데이트
    const newBlocks = inputBlocks.map((block, i) => 
      i === index ? updatedBlock : block
    );
    setInputBlocks(newBlocks);

    if (index === 0) {
      if (setYieldValue) setYieldValue(blockToSave.yieldValue);
      if (setSecondValue) setSecondValue(blockToSave.secondValue);
    }
    setLastSaved(lastSavedStr);

    // 🔥 생산음량 이력 저장 (상세 이력관리용)
    if (blockToSave.yieldValue && blockToSave.yieldValue !== '') {
      const productionHistoryKey = `process_${id}_production_blocks_${currentTeam}`;
      const existingBlocks = JSON.parse(localStorage.getItem(productionHistoryKey) || '[]');
      
      // 기존에 동일 블록이 있는지 확인
      const existingIndex = existingBlocks.findIndex(b => b.blockId === updatedBlock.id);
      
      if (existingIndex >= 0) {
        // 기존 블록 업데이트
        existingBlocks[existingIndex] = updatedBlock;
      } else {
        // 새 블록 추가
        existingBlocks.push(updatedBlock);
      }
      
      localStorage.setItem(productionHistoryKey, JSON.stringify(existingBlocks));
      console.log(`🔥 생산량 블록 저장: ${productionHistoryKey}`, updatedBlock);
    }

    fetch(`http://localhost:3001/api/processTitles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        yield: blockToSave.yieldValue,
        secondField: blockToSave.secondValue,
        lastSaved: lastSavedStr
      })
    });
  };

  // 🔥 해당 블럭의 내용들만 지우는 CLEAR 함수 추가
  const handleClearBlock = (index) => {
    try {
      if (!window.confirm('해당 블럭의 내용을 모두 지우시겠습니까?')) return;
      
      // 안전장치: inputBlocks와 해당 인덱스 확인
      if (!inputBlocks || !inputBlocks[index]) {
        console.log('블럭 데이터가 없습니다.');
        return;
      }
      
      const clearedBlock = {
        ...inputBlocks[index],
        yieldValue: '',
        secondValue: '',
        mainEquipment: '',
        mainTime: '',
        mainDescription: '',
        maintStart: '',
        maintEnd: '',
        maintEquipment: '',
        maintDescription: '',
        downStart: '',
        downEnd: '',
        downReason: '',
        selectedEquipment: '',
        equipmentOption: '',
        maintenanceItems: [],
        downtimeItems: [],
        equipmentHistory: []
      };
      
      const newBlocks = inputBlocks.map((block, i) => 
        i === index ? clearedBlock : block
      );
      setInputBlocks(newBlocks);

    // 🔥 부모 컴포넌트 상태도 즉시 업데이트 (실시간 반영)
    if (index === 0) {
      if (setYieldValue) setYieldValue('');
      if (setSecondValue) setSecondValue('');
    }
    
    // 🔥 저장된 시간도 완전히 지우기 (즉시 반영)
    setLastSaved(null);

    // 🔥 localStorage에서도 해당 블럭 데이터 지우기
    localStorage.setItem(`process_${id}_blocks_${currentTeam}`, JSON.stringify(newBlocks));
    
    // 🔥 생산량 이력 완전히 지우기 (모든 블럭)
    const productionHistoryKey = `process_${id}_production_blocks_${currentTeam}`;
    localStorage.removeItem(productionHistoryKey);
    
    // 🔥 생산량 개별 저장 이력도 지우기
    const yieldKey = `process_${id}_yield_${currentTeam}`;
    const yieldHistoryKey = `process_${id}_yield_history_${currentTeam}`;
    localStorage.removeItem(yieldKey);
    localStorage.removeItem(yieldHistoryKey);
    
    // 🔥 자재명 개별 저장 이력도 지우기
    const secondFieldKey = `process_${id}_secondField_${currentTeam}`;
    const materialHistoryKey = `process_${id}_material_history_${currentTeam}`;
    localStorage.removeItem(secondFieldKey);
    localStorage.removeItem(materialHistoryKey);
    
    // 🔥 정비이력도 완전히 지우기
    const maintenanceKey = `process_${id}_maintenance_${currentTeam}`;
    localStorage.removeItem(maintenanceKey);
    
    // 🔥 비가동이력도 완전히 지우기  
    const downtimeKey = `process_${id}_downtime_${currentTeam}`;
    localStorage.removeItem(downtimeKey);
    
    // 🔥 추가 이력들도 완전히 지우기
    const additionalKey = `process_${id}_additional_history_${currentTeam}`;
    localStorage.removeItem(additionalKey);
    
    // 🔥 장비메모, 장비이력(자재선택), 장비상태 완전히 지우기 (해당 공정의 모든 장비)
    if (equipments && Array.isArray(equipments)) {
      equipments.forEach(eq => {
        if (eq && eq.id) {
          const memoKey = `equipment_${eq.id}_memo_${currentTeam}`;
          const materialKey = `equipment_${eq.id}_material_${currentTeam}`;
          const statusKey = `equipment_${eq.id}_status_${currentTeam}`;
          const optionKey = `equipment_${eq.id}_option_${currentTeam}`;
          const selectedKey = `equipment_${eq.id}_selected_${currentTeam}`;
          localStorage.removeItem(memoKey);
          localStorage.removeItem(materialKey);
          localStorage.removeItem(statusKey);
          localStorage.removeItem(optionKey); 
          localStorage.removeItem(selectedKey);
        }
      });
    }
    
    // 🔥 서버에도 즉시 업데이트 요청 (실시간 반영)
    try {
      fetch(`http://localhost:3001/api/processTitles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          yield: '',
          secondField: '',
          lastSaved: null
        })
      }).catch(err => console.log('서버 업데이트 실패:', err));
    } catch (error) {
      console.log('CLEAR 서버 요청 에러:', error);
    }
    
    console.log(`🔥 블럭 ${index + 1} 모든 내용, 정비이력, 장비메모, 장비이력, 장비상태, 장비옵션 완전 지우기 및 실시간 반영 완료`);
    } catch (error) {
      console.error('CLEAR 함수 실행 중 오류:', error);
      alert('데이터 삭제 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  const blueBoxRef = React.useRef(null);
  useEffect(() => {
    if (!showMaint) return;
    function handleClickOutside(e) {
      if (blueBoxRef.current && blueBoxRef.current.contains(e.target)) return;
      setShowMaint(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMaint, setShowMaint]);

  return (
    <Draggable defaultPosition={{ x, y }} onStop={(e, data) => isAdmin && isEditMode && onMove(id, data.x, data.y)} disabled={!(isAdmin && isEditMode)} key={id + '-' + x + '-' + y}>
      <div style={{ position: 'absolute', zIndex: 10000, minWidth: 60, background: '#0074D9', color: '#fff', border: '1px solid #bbb', borderRadius: 4, padding: '2px 8px', textAlign: 'center', boxShadow: '0 1px 4px #ccc', fontWeight: 'bold', fontSize: 14 }} onClick={onClick} data-process-id={id}>
        {isAdmin && isEditMode && edit ? <input value={value} onChange={e => setValue(e.target.value)} onBlur={() => { setEdit(false); onEdit(id, value); }} autoFocus style={{ fontSize: 14, width: 80 }} /> : <span onDoubleClick={() => isAdmin && isEditMode && setEdit(true)}>{title}</span>}
        {lineName && <span style={{ marginLeft: 6, color: '#888', fontSize: 12 }}>({lineName})</span>}
        {lastSaved && <span style={{ marginLeft: 8, color: '#ff0', fontSize: 11 }}>저장: {lastSaved}</span>}
        {isAdmin && isEditMode && <button style={{ marginLeft: 6, fontSize: 10 }} onClick={() => { if (window.confirm('삭제하겠습니까?')) onDelete(id); }}>X</button>}
        <button style={{ marginLeft: 6, fontSize: 10 }} onClick={e => { e.stopPropagation(); setShowMaint(s => !s); }}>생산량</button>
        {/* 생산량 창을 Portal로 렌더링 */}
        {showMaint && (() => {
          const processElement = document.querySelector(`[data-process-id="${id}"]`);
          if (!processElement) return null;
          
          const rect = processElement.getBoundingClientRect();
          const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
          const scrollY = window.pageYOffset || document.documentElement.scrollTop;
          
          return createPortal(
            <DynamicPositionWrapper 
              ref={blueBoxRef}
              processRect={rect}
              scrollX={scrollX}
              scrollY={scrollY}
              inputBlocksCount={inputBlocks.length}
              style={{ 
                zIndex: 999999, 
                background: '#f9f9f9', 
                border: '2px solid #0074D9', 
                padding: '12px', 
                fontSize: 11, 
                color: '#000', 
                minWidth: 'max-content', 
                textAlign: 'left',
                borderRadius: 6,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }} 
              onClick={e => e.stopPropagation()}
            >
            {((!isAdmin) || (isAdmin && isEditMode)) && <button onClick={addBlock} style={{ position: 'absolute', top: 8, right: 8, zIndex: 1, fontSize: 13, fontWeight: 'bold', background: '#fff', color: '#222', border: '1.5px solid #bbb', borderRadius: 4, boxShadow: '0 1px 3px rgba(0,0,0,0.2)', width: 24, height: 24, padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>＋</button>}
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch' }}>
              {inputBlocks.map((block, index) => (
                <React.Fragment key={block.id}>
                  {index > 0 && <div style={{ borderLeft: '1px solid #ccc', margin: '0 8px' }} />}
                  <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                      <span>생산량:</span>
                      <input type="text" inputMode="numeric" value={block.yieldValue} onChange={e => handleBlockChange(index, 'yieldValue', e.target.value)} style={{ width: 60, height: 24, fontSize: 13 }} placeholder="Output" readOnly={isAdmin && !isEditMode} />
                      <span style={{ marginLeft: 8 }}>자재명:</span>
                      <input type="text" value={block.secondValue} onChange={e => handleBlockChange(index, 'secondValue', e.target.value)} style={{ width: 60, height: 24, fontSize: 13 }} placeholder="Material" readOnly={isAdmin && !isEditMode} />
                      {((!isAdmin) || (isAdmin && isEditMode)) && (
                        <>
                          <button style={{ fontSize: 11, padding: '2px 10px', background: '#0074D9', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: 'pointer' }} onClick={() => handleSaveYield(index)}>SAVE</button>
                          <button style={{ fontSize: 11, padding: '2px 10px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: 'pointer', marginLeft: 4 }} onClick={() => handleClearBlock(index)}>CLEAR</button>
                          {index > 0 && (
                            <button
                              style={{ fontSize: 11, padding: '2px 8px', background: '#ff4d4f', color: 'white', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: 'pointer', marginLeft: '4px' }}
                              onClick={() => removeBlock(index)}
                            >X</button>
                          )}
                        </>
                      )}
                    </div>

                    {((!isAdmin) || (isAdmin && isEditMode)) && (
                      <>
                        {/* 정비이력 입력 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderTop: '1px solid #eee', paddingTop: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 'bold', color: '#FF6B6B', minWidth: 40 }}>🔧정비:</span>
                          <input type="text" placeholder="Start" value={block.maintStart} onChange={e => handleBlockChange(index, 'maintStart', e.target.value)} style={{ width: 50 }} />
                          <span>~</span>
                          <input type="text" placeholder="End" value={block.maintEnd} onChange={e => handleBlockChange(index, 'maintEnd', e.target.value)} style={{ width: 50 }} />
                          <input type="text" placeholder="EQ No." value={block.maintEqNo} onChange={e => handleBlockChange(index, 'maintEqNo', e.target.value)} style={{ width: 60 }} />
                          <input type="text" placeholder="정비 내용" value={block.maintDesc} onChange={e => handleBlockChange(index, 'maintDesc', e.target.value)} style={{ width : 80 }} />
                          <button style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => addMaint(index)}>추가</button>
                        </div>
                        
                        {/* 비가동 입력 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderTop: '1px solid #eee', paddingTop: 8, marginTop: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 'bold', color: '#333', minWidth: 40 }}>⏸️비가동:</span>
                          <input type="text" placeholder="Start" value={block.downStart} onChange={e => handleBlockChange(index, 'downStart', e.target.value)} style={{ width: 50 }} />
                          <span>~</span>
                          <input type="text" placeholder="End" value={block.downEnd} onChange={e => handleBlockChange(index, 'downEnd', e.target.value)} style={{ width: 50 }} />
                          <input type="text" placeholder="비가동 사유" value={block.downReason} onChange={e => handleBlockChange(index, 'downReason', e.target.value)} style={{ width: 140 }} />
                          <button style={{ fontSize: 10, padding: '2px 8px', backgroundColor: '#FFE66D', color: '#333' }} onClick={() => addDowntime(index)}>추가</button>
                        </div>
                      </>
                    )}

            <div style={{ marginTop: '16px' }}>
              <b>이력:</b>
              <ul style={{ paddingLeft: 12, margin: 0 }}>
                {(() => {
                  // 현재 블럭의 모든 이력
                  const allMaints = (Array.isArray(maintenanceHistory) ? maintenanceHistory : [])
                    .map((m, originalIndex) => ({ ...m, originalIndex }))
                    .filter(m => m.blockIndex === index || (m.blockIndex === undefined && index === 0));
                  
                  // 메인 이력(추가가 아닌 것)들만 찾기
                  const mainMaints = allMaints.filter(m => !m._addedByPlus);
                  
                  return mainMaints.map((mainM) => {
                    // 이 메인 이력에서 플러스로 추가한 것들 찾기
                    const plusMaints = allMaints.filter(m => 
                      m._addedByPlus && m._groupSource === mainM.originalIndex
                    );
                    
                    // 메인 이력 + 플러스 추가 이력들의 총 시간 계산
                    const groupMaints = [mainM, ...plusMaints];
                    const totalTime = groupMaints.reduce((sum, m) => {
                      if (typeof m.time === 'number' && !isNaN(m.time)) return sum + m.time;
                      const match = m.description && m.description.match(/(\d{2}):(\d{2})~(\d{2}):(\d{2})/);
                      if (match) {
                        const sh = parseInt(match[1], 10), sm = parseInt(match[2], 10);
                        const eh = parseInt(match[3], 10), em = parseInt(match[4], 10);
                        let min = (eh - sh) * 60 + (em - sm);
                        if (!isNaN(min) && min < 0) min += 24 * 60;
                        if (!isNaN(min) && min >= 0) return sum + min;
                      }
                      return sum;
                    }, 0);
                    
                    return (
                      <React.Fragment key={`main-${mainM.originalIndex}`}>
                        {/* 메인 이력 표시 */}
                        {(() => {
                          const m = mainM;
                          let timeRange = '';
                          let minText = '';
                          const match = m.description.match(/(\d{2}):(\d{2})~(\d{2}):(\d{2})/);
                          if (match) {
                            timeRange = `${match[1]}:${match[2]}~${match[3]}:${match[4]}`;
                            const sh = parseInt(match[1], 10), sm = parseInt(match[2], 10);
                            const eh = parseInt(match[3], 10), em = parseInt(match[4], 10);
                            let min = (eh - sh) * 60 + (em - sm);
                            if (!isNaN(min) && min < 0) min += 24 * 60;
                            if (!isNaN(min) && min >= 0) minText = `${min}분`;
                          } else if (m.time !== '' && m.time !== undefined && m.time !== null) {
                            minText = `${m.time}분`;
                          }
                          const desc = m.description.replace(/\d{2}:\d{2}~\d{2}:\d{2}\s*/, '');
                          return (
                            <li style={{ marginBottom: 2, display: 'flex', alignItems: 'center' }}>
                              <span style={{ flex: 1, textAlign: 'left', display: 'block' }}>
                                {m.eqNo && <span style={{ marginRight: 4, color: '#006400', fontWeight: 'bolder', fontSize: 15 }}>[{m.eqNo}]</span>}
                                {timeRange ? timeRange : ''}
                                {minText ? (timeRange ? ' / ' : '') + minText : ''}
                                {desc ? (timeRange || minText ? ' / ' : '') + desc : ''}
                              </span>
                              {((!isAdmin) || (isAdmin && isEditMode)) && (
                                <button style={{ marginLeft: 2, fontSize: 10 }} onClick={() => setOpenMaintInputIdx(openMaintInputIdx === mainM.originalIndex ? null : mainM.originalIndex)}>+</button>
                              )}
                              <button style={{ marginLeft: 6, fontSize: 10 }} onClick={() => onDeleteMaint(id, mainM.originalIndex)}>삭제</button>
                            </li>
                          );
                        })()}
                        
                        {/* 플러스로 추가한 이력들 표시 */}
                        {plusMaints.map((m, j) => {
                          let timeRange = '';
                          let minText = '';
                          const match = m.description.match(/(\d{2}):(\d{2})~(\d{2}):(\d{2})/);
                          if (match) {
                            timeRange = `${match[1]}:${match[2]}~${match[3]}:${match[4]}`;
                            const sh = parseInt(match[1], 10), sm = parseInt(match[2], 10);
                            const eh = parseInt(match[3], 10), em = parseInt(match[4], 10);
                            let min = (eh - sh) * 60 + (em - sm);
                            if (!isNaN(min) && min < 0) min += 24 * 60;
                            if (!isNaN(min) && min >= 0) minText = `${min}분`;
                          } else if (m.time !== '' && m.time !== undefined && m.time !== null) {
                            minText = `${m.time}분`;
                          }
                          const desc = m.description.replace(/\d{2}:\d{2}~\d{2}:\d{2}\s*/, '');
                          return (
                            <li key={m.originalIndex + '-' + j} style={{ marginBottom: 2, display: 'flex', alignItems: 'center' }}>
                              <span style={{ flex: 1, textAlign: 'left', display: 'block' }}>
                                <b style={{ color: '#0074D9', marginRight: 2 }}>ㄴ</b>
                                {timeRange ? timeRange : ''}
                                {minText ? (timeRange ? ' / ' : '') + minText : ''}
                                {desc ? (timeRange || minText ? ' / ' : '') + desc : ''}
                                <span style={{ color: '#0074D9', marginLeft: 4, fontWeight: 'bold', fontSize: 11 }}>(추가)</span>
                              </span>
                              <button style={{ marginLeft: 6, fontSize: 10 }} onClick={() => onDeleteMaint(id, m.originalIndex)}>삭제</button>
                              {/* +버튼은 플러스 이력에는 표시하지 않음 */}
                            </li>
                          );
                        })}
                        
                        {/* 플러스(+) 버튼 눌렀을 때 추가 이력 입력창 */}
                        {((!isAdmin) || (isAdmin && isEditMode)) && openMaintInputIdx === mainM.originalIndex && (
                          <li style={{ marginBottom: 2, display: 'flex', alignItems: 'center', background: '#eef', padding: 4, borderRadius: 4 }}>
                            <input type="text" placeholder="시작(예: 08:00)" value={plusInputs[mainM.originalIndex]?.start || ''} onChange={e => setPlusInputs(inputs => ({ ...inputs, [mainM.originalIndex]: { ...inputs[mainM.originalIndex], start: e.target.value } }))} style={{ width: 70, marginRight: 6, color: '#000' }} />
                            <span style={{ marginRight: 6, color: '#000' }}>~</span>
                            <input type="text" placeholder="종료(예: 08:05)" value={plusInputs[mainM.originalIndex]?.end || ''} onChange={e => setPlusInputs(inputs => ({ ...inputs, [mainM.originalIndex]: { ...inputs[mainM.originalIndex], end: e.target.value } }))} style={{ width: 70, marginRight: 6, color: '#000' }} />
                            <input type="text" placeholder="정비 내용" value={plusInputs[mainM.originalIndex]?.desc || ''} onChange={e => setPlusInputs(inputs => ({ ...inputs, [mainM.originalIndex]: { ...inputs[mainM.originalIndex], desc: e.target.value } }))} style={{ flex: 1, marginRight: 6, color: '#000' }} />
                            <button style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => {
                              const s = plusInputs[mainM.originalIndex]?.start || '';
                              const e_ = plusInputs[mainM.originalIndex]?.end || '';
                              const d = plusInputs[mainM.originalIndex]?.desc || '';
                              let eqNo = mainM.eqNo || '';
                              
                              // eqNo가 없으면 사용자에게 입력 요청
                              if (!eqNo) {
                                eqNo = prompt('장비번호를 입력해주세요 (메모 연동을 위해 필요합니다):') || '';
                              }
                              
                              if (!s || !e_ || !d) {
                                alert('시작/종료 시간, 정비 내용을 모두 입력해주세요.');
                                return;
                              }
                              const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
                              if (!timeRegex.test(s) || !timeRegex.test(e_)) {
                                alert('시간을 HH:MM 형식으로 정확히 입력해주세요.');
                                return;
                              }
                              const [sh, sm] = s.split(':').map(Number);
                              const [eh, em] = e_.split(':').map(Number);
                              let min = (eh - sh) * 60 + (em - sm);
                              if (isNaN(min)) min = '';
                              if (min < 0) min += 24 * 60;
                              const newMaint = { 
                                time: min, 
                                description: `${s}~${e_} ${d}`, 
                                eqNo, 
                                _addedByPlus: true, 
                                blockIndex: index,
                                _groupSource: mainM.originalIndex
                              };
                              onAddMaint(id, newMaint);
                              setPlusInputs(inputs => ({ ...inputs, [mainM.originalIndex]: { start: '', end: '', desc: '' } }));
                              setOpenMaintInputIdx(null);
                            }}>추가</button>
                            <button style={{ fontSize: 10, marginLeft: 2 }} onClick={() => setOpenMaintInputIdx(null)}>닫기</button>
                          </li>
                        )}
                        
                        {/* 이 그룹(메인 이력 + 플러스 추가)의 총 정비 시간 */}
                        <li style={{ color: '#0074D9', fontWeight: 'bold', fontSize: 13, marginBottom: 4 }}>
                          → 이 그룹의 총 정비 시간: {totalTime}분
                        </li>
                      </React.Fragment>
                    );
                  });
                })()}
              </ul>
              
              {/* 비가동 이력 표시 */}
              <div style={{ marginTop: '12px' }}>
                                 <b style={{ color: '#333' }}>⏸️ 비가동 이력:</b>
                <ul style={{ paddingLeft: 12, margin: 0 }}>
                  {(() => {
                    // 현재 조의 비가동 이력 가져오기
                    const downKey = `process_${id}_downtime_${currentTeam}`;
                    const downtimeHistory = JSON.parse(localStorage.getItem(downKey) || '[]');
                    
                    // 현재 블럭의 비가동 이력만 필터링
                    const blockDowntimes = downtimeHistory.filter(d => 
                      d.blockIndex === index || (d.blockIndex === undefined && index === 0)
                    );
                    
                    if (blockDowntimes.length === 0) {
                      return <li style={{ fontSize: 10, color: '#999' }}>비가동 이력이 없습니다.</li>;
                    }
                    
                    return blockDowntimes.map((downtime, downIndex) => {
                      const hours = Math.floor(downtime.time / 60);
                      const mins = downtime.time % 60;
                      
                      return (
                        <li key={downIndex} style={{ fontSize: 10, marginBottom: 2 }}>
                                                     <span style={{ color: '#333', fontWeight: 'bold' }}>
                             {downtime.description}
                           </span>
                          <span style={{ color: '#888', marginLeft: 8 }}>
                            ({hours}h {mins}m)
                          </span>
                        </li>
                      );
                    });
                  })()}
                </ul>
              </div>
            </div>
                  </div>
                </React.Fragment>
                ))}
              </div>
            </DynamicPositionWrapper>,
            document.body
          );
        })()}
      </div>
    </Draggable>
  );
}

const statusColor = {
  running: 'green',
  stopped: 'red',
  idle: 'gold',
  maint: 'orange',
};

// AddEquipmentForm 컴포넌트는 이제 통합 편집 도구 패널로 대체됨

function EquipmentNode({ eq, onMove, onDelete, onStatusChange, isAdmin, isEditMode, equipments, setEquipments, showStatus, setShowStatus, onClick, zIndex, optionInputOpen, showMaint, setShowMaint, showMemo, setShowMemo, openPopup, setOpenPopup, showOptionBox, setShowOptionBox, openOptionEquipmentId, setOpenOptionEquipmentId, resizeTargetId, setResizeTargetId, showPopup, setPopups, currentTeam, memoRefresh, processTitles }) {
  const statusOptions = [
    { value: 'running', label: '가동' },
    { value: 'stopped', label: '비가동' },
    { value: 'maint', label: '정비중' },
    { value: 'idle', label: '가동대기' },
  ];
  // 타워램프 색상 매핑
  const lampColor = {
    running: 'green',
    stopped: 'orange', // 비가동은 주황색
    idle: 'yellow',
    maint: 'red',
  };
  // 장비 이름 수정 상태
  const [edit, setEdit] = React.useState(false);
  const [value, setValue] = React.useState(eq.name);
  React.useEffect(() => { setValue(eq.name); }, [eq.name]);
  // 이름 저장 함수
  const saveName = () => {
    setEdit(false);
    if (value !== eq.name) {
      fetch(`http://localhost:3001/api/equipments/${eq.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: value })
      });
    }
  };
  // 메모 관련 상태 (실시간 업데이트)
  const [memo, setMemo] = React.useState('');
  const [localMemoRefresh, setLocalMemoRefresh] = React.useState(0);
  
  // 메모 로드 함수
  const loadMemo = React.useCallback(() => {
    const memoKey = `equipment_${eq.id}_memo_${currentTeam}`;
    const teamMemo = localStorage.getItem(memoKey) || '';
    setMemo(teamMemo);
  }, [eq.id, currentTeam]);
  
     // 메모 로드 (팀 변경 시 또는 강제 새로고침 시)
   React.useEffect(() => {
     loadMemo();
      }, [loadMemo, localMemoRefresh, eq.memoRefresh]);
  const textareaRef = React.useRef(null);
  // textarea 자동 크기 조절 함수
  function autoResize(textarea) {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.width = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
    textarea.style.width = Math.min(textarea.scrollWidth, 400) + 'px'; // 최대 400px
  }
  React.useEffect(() => {
    if (showMemo && textareaRef.current) {
      autoResize(textareaRef.current);
    }
  }, [showMemo]);
  const saveMemo = () => {
    setShowMemo(false);
    // 조별로 메모 저장
    const memoKey = `equipment_${eq.id}_memo_${currentTeam}`;
    localStorage.setItem(memoKey, memo);
    
    // UI 업데이트를 위해 equipments에도 반영 (현재 조만)
    setEquipments(eqs => eqs.map(e => e.id === eq.id ? { 
      ...e, 
      memo,
      memoRefresh: (e.memoRefresh || 0) + 1
    } : e));
  };

  // 옵션(자재) 관련 상태
  const [optionInput, setOptionInput] = React.useState('');
  const [options, setOptions] = React.useState(eq.options || []);
  const [selectedOption, setSelectedOption] = React.useState(eq.selectedOption || '');
  React.useEffect(() => {
    setOptions(eq.options || []);
    setSelectedOption(eq.selectedOption || '');
  }, [eq.options, eq.selectedOption]);

  // 옵션창 열림 상태 (장비별)
  // const [showOptionBox, setShowOptionBox] = React.useState(false); // 제거

  // 옵션 추가 (관리자)
  const addOption = () => {
    const value = optionInput.trim();
    if (!value || options.includes(value)) return;
    const newOptions = [...options, value];
    setOptions(newOptions);
    setOptionInput('');
    // 서버 저장
    fetch(`http://localhost:3001/api/equipments/${eq.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: newOptions })
    });
    setShowOptionBox(false); // 추가 후 닫기
  };
  // 옵션 삭제 (관리자)
  const deleteOption = (opt) => {
    const newOptions = options.filter(o => o !== opt);
    setOptions(newOptions);
    if (selectedOption === opt) setSelectedOption('');
    fetch(`http://localhost:3001/api/equipments/${eq.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options: newOptions, selectedOption: selectedOption === opt ? '' : selectedOption })
    });
    setShowOptionBox(false); // 삭제 후 닫기
  };
  // 옵션 선택 (작업자) - 조별 저장 + 작업 자재명 이력 저장 추가
  const handleSelectOption = (e) => {
    const value = e.target.value;
    setSelectedOption(value);
    
    // 🔥 조별 자재명 저장
    const materialKey = `equipment_${eq.id}_material_${currentTeam}`;
    localStorage.setItem(materialKey, value);
    console.log(`🔥 조별 자재명 저장: ${materialKey} = ${value}`);
    
    // 🔥 작업 자재명 이력 저장 (해당 공정에 연결)
    if (value && value !== '') {
      // 장비가 속한 공정을 찾기 (장비 위치 기반으로 가장 가까운 공정 찾기)
      const findNearestProcess = () => {
        let nearestProcess = null;
        let minDistance = Infinity;
        
        processTitles.forEach(process => {
          const distance = Math.sqrt(
            Math.pow(eq.x - process.x, 2) + Math.pow(eq.y - process.y, 2)
          );
          if (distance < minDistance) {
            minDistance = distance;
            nearestProcess = process;
          }
        });
        
        return nearestProcess;
      };
      
      const nearestProcess = findNearestProcess();
      if (nearestProcess) {
        const materialHistoryKey = `process_${nearestProcess.id}_material_history_${currentTeam}`;
        const existingHistory = JSON.parse(localStorage.getItem(materialHistoryKey) || '[]');
        const newEntry = {
          materialName: value,
          equipmentName: eq.name,
          timestamp: new Date().toISOString()
        };
        const updatedHistory = [...existingHistory, newEntry];
        localStorage.setItem(materialHistoryKey, JSON.stringify(updatedHistory));
        console.log(`🔥 작업자재 이력 저장: ${materialHistoryKey} 에 ${eq.name}→${value} 추가`);
      }
    }
    
    fetch(`http://localhost:3001/api/equipments/${eq.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedOption: value })
    })
    .then(() => {
      // 🔥 핵심 기능: 자재명 선택 시 어싸인 표 업데이트 (강제 트리거)
      setTimeout(() => {
        if (window.globalUpdateAssignmentTableMaterial) {
          window.globalUpdateAssignmentTableMaterial(eq.name, [value]);
          console.log(`🔥 자재명 선택 연동: ${eq.name} → ${value}`);
        }
      }, 100); // 100ms 지연으로 상태 업데이트 후 실행
    });
    setShowOptionBox(false); // 선택 후 닫기
  };

  // bringToFront를 모든 주요 UI에 적용하기 위한 핸들러
  const handleBringToFront = (e) => {
    if (typeof onClick === 'function') onClick(e);
  };

  // [추가] 장비 이미지 사이즈 상태
  const [imgSize, setImgSize] = React.useState({ width: eq.imgWidth || 80, height: eq.imgHeight || 48 });
  // 최초 기준 크기 저장 (useRef로 안전하게)
  const originImgSize = React.useRef({ width: eq.imgWidth || 80, height: eq.imgHeight || 48 });
  const [resizing, setResizing] = React.useState(false);
  const [showResizeHandle, setShowResizeHandle] = React.useState(false);
  const imgRef = React.useRef(null);
  React.useEffect(() => {
    setImgSize({ width: eq.imgWidth || 57, height: eq.imgHeight || 65 });
  }, [eq.imgWidth, eq.imgHeight]);
  // [추가] 리사이즈 임시 상태
  const [pendingSize, setPendingSize] = React.useState(null);
  // [추가] 리사이즈 모드 상태
  const [resizeMode, setResizeMode] = React.useState(false);

  // 메모장 바깥 클릭 시 닫힘 처리
  React.useEffect(() => {
    if (!showMemo) {
      doubleClickRef.current = false; // 메모장 닫힐 때 flag 초기화
      return;
    }
    function handleClickOutside(e) {
      setShowMemo(false);
      if (typeof setOpenOptionEquipmentId === 'function') setOpenOptionEquipmentId(null);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMemo, setShowMemo, setOpenOptionEquipmentId]);

  const doubleClickRef = React.useRef(false);

  return (
    <Draggable
      position={{ x: eq.x, y: eq.y }}
      onStop={(e, data) => {
        if (isAdmin && isEditMode) {
          onMove(eq.id, data.x, data.y);
        }
      }}
      disabled={!(isAdmin && isEditMode)}
      key={eq.id + '-' + eq.x + '-' + eq.y}
    >
      <div style={{ position: 'absolute', width: 80, zIndex }} data-equipment-id={eq.id}>
        {/* 메모 세모 마크 */}
        {eq.memo && eq.memo.trim() && (
          <div style={{
            position: 'absolute', left: 20, top: 8, width: 0, height: 0,
            borderLeft: 0,
            borderRight: '8px solid transparent',
            borderTop: '8px solid red',
            zIndex: 10
          }} />
        )}
        {/* 타워램프 신호등 */}
        <div style={{ width: (pendingSize ? pendingSize.width : imgSize.width), height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 2, marginLeft: 'auto', marginRight: 'auto' }}>
          <div style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: lampColor[eq.status] || 'gray',
            border: '1px solid #888',
            boxShadow: `0 0 12px 6px ${lampColor[eq.status] || 'gray'}, 0 0 24px 12px ${lampColor[eq.status] || 'gray'}`
          }} />
        </div>
        {/* 장비 이미지 */}
        <div
          onClick={e => {
            if (doubleClickRef.current) {
              doubleClickRef.current = false;
              return;
            }
            setTimeout(() => {
              if (!doubleClickRef.current) {
            e.stopPropagation();
            setShowStatus(true); // 상태창만 열림
            setOpenOptionEquipmentId(null); // 자재 옵션창 모두 닫힘
                if (isAdmin && isEditMode) setResizeTargetId(eq.id); // 이미지 클릭 시에만 리사이즈 타겟 지정
              }
            }, 200);
          }}
          onDoubleClick={e => {
            doubleClickRef.current = true;
            e.stopPropagation();
            setShowMemo(true);
            setShowStatus(false);
            handleBringToFront(e);
            if (isAdmin && isEditMode) setResizeTargetId(null);
          }}
          style={{ width: (pendingSize ? pendingSize.width : imgSize.width), height: (pendingSize ? pendingSize.height : imgSize.height), cursor: 'pointer', position: 'relative', margin: '0 auto' }}
          onMouseLeave={() => setShowResizeHandle(false)}
          ref={imgRef}
        >
          {eq.iconUrl ? (
            <img
              src={eq.iconUrl}
              alt={eq.name}
              style={{
                width: (pendingSize ? pendingSize.width : imgSize.width),
                height: (pendingSize ? pendingSize.height : imgSize.height),
                objectFit: 'fill', // stretch/fill로 꽉 채움
                borderRadius: 4,
                backgroundColor: 'transparent',
                display: 'block',
              }}
            />
          ) : (
            <div style={{
              background: '#666', color: '#fff', width: (pendingSize ? pendingSize.width : imgSize.width), height: (pendingSize ? pendingSize.height : imgSize.height),
              display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4
            }}>
              {eq.name[0]}
            </div>
          )}
          {/* 사이즈 조정 이모티콘 (관리자, 이미지 클릭 시에만 보임, 리사이즈 모드 아닐 때만) */}
          {isAdmin && isEditMode && !showMemo && resizeTargetId === eq.id && !resizeMode && (
            <>
              <button
                style={{
                  position: 'absolute', bottom: 5, right: -2, background: 'none', border: 'none', fontSize: 15, color: '#222', cursor: 'pointer', zIndex: 10, padding: 0, lineHeight: 1
                }}
                title="드래그로 사이즈 조정"
                onClick={e => {
                  e.stopPropagation();
                  if (window.confirm('드래그로 사이즈를 조정하시겠습니까?')) {
                    setResizeMode(true);
                    setPendingSize({ ...imgSize });
                  }
                }}
              >
                <span style={{ fontSize: 15, color: '#fff', fontWeight: 'bold' }}>⤡</span>
              </button>
              
              {/* 숫자 입력 버튼 */}
              <button
                style={{
                  position: 'absolute', bottom: 5, right: 15, background: '#28a745', border: 'none', fontSize: 8, color: '#fff', cursor: 'pointer', zIndex: 10, padding: '2px 4px', borderRadius: 3, fontWeight: 'bold'
                }}
                title="숫자로 사이즈 지정"
                onClick={e => {
                  e.stopPropagation();
                  const input = prompt(`현재 크기: ${imgSize.width} x ${imgSize.height}\n\n가로,세로 크기를 입력하세요 (예: 80,90):`, `${imgSize.width},${imgSize.height}`);
                  
                  if (input && input.includes(',')) {
                    const [w, h] = input.split(',');
                    const width = parseInt(w.trim());
                    const height = parseInt(h.trim());
                    
                    if (width > 0 && height > 0) {
                      // 즉시 크기 변경
                      setImgSize({ width, height });
                      
                      // 서버에 저장
                      fetch(`http://localhost:3001/api/equipments/${eq.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imgWidth: width, imgHeight: height })
                      });
                    } else {
                      alert('올바른 숫자를 입력해주세요');
                    }
                  }
                }}
              >
                가로,세로
              </button>
            </>
          )}
          {/* 리사이즈 핸들 및 저장/취소/되돌리기 버튼 (관리자, 이미지 클릭+이모티콘 클릭 시에만) */}
          {isAdmin && isEditMode && resizeMode && resizeTargetId === eq.id && !showMemo && (
            <>
            <div
              style={{
                position: 'absolute', bottom: 7, right: -4, width: 15, height: 15, cursor: 'nwse-resize', zIndex: 20, background: 'none', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', userSelect: 'none'
              }}
              onMouseDown={e => {
                e.stopPropagation();
                setResizing(true);
              }}
            >
              <span style={{ fontSize: 15, color: '#fff', fontWeight: 'bold' }}>⤡</span>
            </div>
              {/* 드래그 오버레이: 리사이즈 중에만 렌더링 */}
          {resizing && (
            <div
              style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', zIndex: 9999, cursor: 'nwse-resize' }}
              onMouseMove={e => {
                if (!imgRef.current) return;
                const rect = imgRef.current.getBoundingClientRect();
                const newWidth = Math.max(40, e.clientX - rect.left);
                const newHeight = Math.max(24, e.clientY - rect.top);
                setPendingSize({ width: newWidth, height: newHeight });
              }}
              onMouseUp={e => {
                setResizing(false);
                setShowResizeHandle(false);
              }}
            />
          )}
                             {/* 저장/취소/되돌리기 버튼을 Portal로 렌더링 */}
               {(() => {
                 const equipmentElement = document.querySelector(`[data-equipment-id="${eq.id}"]`);
                 if (!equipmentElement) return null;
                 
                 const rect = equipmentElement.getBoundingClientRect();
                 const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
                 const scrollY = window.pageYOffset || document.documentElement.scrollTop;
                 // pendingSize를 고려한 실시간 위치 계산
                 const currentWidth = pendingSize ? pendingSize.width : imgSize.width;
                 const left = rect.left + scrollX + (currentWidth / 2);
                 const top = rect.top + scrollY - 60;
                
                return createPortal(
                  <div style={{ 
                    position: 'absolute', 
                    left: `${left}px`, 
                    top: `${top}px`, 
                    transform: 'translateX(-50%)', 
                    zIndex: 999999, 
                    background: '#fff', 
                    border: '2px solid #0074D9', 
                    borderRadius: 6, 
                    padding: '4px 8px', 
                    display: 'flex', 
                    flexDirection: 'row', 
                    gap: 4, 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)', 
                    minHeight: 0, 
                    minWidth: 200,
                    alignItems: 'center'
                  }}>
                    <input 
                      type="number" 
                      value={pendingSize ? pendingSize.width : imgSize.width}
                      onChange={(e) => {
                        const newWidth = Math.max(20, parseInt(e.target.value) || 20);
                        setPendingSize(prev => ({ 
                          width: newWidth, 
                          height: prev ? prev.height : imgSize.height 
                        }));
                      }}
                      style={{ 
                        width: 35, 
                        height: 22, 
                        fontSize: 9, 
                        border: '1px solid #ccc', 
                        borderRadius: 3, 
                        textAlign: 'center',
                        padding: '2px'
                      }}
                      placeholder="W"
                      title="가로 크기"
                    />
                    <input 
                      type="number" 
                      value={pendingSize ? pendingSize.height : imgSize.height}
                      onChange={(e) => {
                        const newHeight = Math.max(20, parseInt(e.target.value) || 20);
                        setPendingSize(prev => ({ 
                          width: prev ? prev.width : imgSize.width,
                          height: newHeight 
                        }));
                      }}
                      style={{ 
                        width: 35, 
                        height: 22, 
                        fontSize: 9, 
                        border: '1px solid #ccc', 
                        borderRadius: 3, 
                        textAlign: 'center',
                        padding: '2px'
                      }}
                      placeholder="H"
                      title="세로 크기"
                    />
                    <button style={{ fontSize: 8, color: '#fff', background: '#0074D9', border: 'none', borderRadius: 4, padding: '2px 8px', minWidth: 36, height: 26, fontWeight: 'bold', letterSpacing: 0, whiteSpace: 'nowrap' }} onClick={() => {
                      setImgSize(pendingSize);
                      setResizeMode(false);
                      // SAVE할 때 originImgSize.current도 갱신
                      originImgSize.current = { ...pendingSize };
                      // 서버 저장
                      fetch(`http://localhost:3001/api/equipments/${eq.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imgWidth: pendingSize.width, imgHeight: pendingSize.height })
                      });
                    }}>SAVE</button>
                    <button style={{ fontSize: 8, color: '#222', background: '#eee', border: 'none', borderRadius: 4, padding: '2px 8px', minWidth: 36, height: 26, whiteSpace: 'nowrap' }} onClick={() => {
                      setImgSize({ width: 57, height: 65 });
                      setResizeMode(false);
                      setPendingSize(null);
                      fetch(`http://localhost:3001/api/equipments/${eq.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imgWidth: 57, imgHeight: 65 })
                      })
                      .then(res => res.json())
                      .then(updated => {
                        setImgSize({ width: updated.imgWidth, height: updated.imgHeight });
                        setResizeMode(false);
                        setPendingSize(null);
                        setEquipments(eqs => eqs.map(e => e.id === updated.id ? updated : e));
                      });
                    }}>RETURN</button>
                  </div>,
                  document.body
                );
              })()}
            </>
          )}
          {showStatus && isAdmin && isEditMode && !showMemo && (
            <button
              style={{
                position: 'absolute',
                top: -10,    // 더 위로
                right: -1,   // 더 왼쪽으로
                width: 20,
                height: 20,
                background: 'transparent',
                color: 'red',
                border: 'none',
                borderRadius: '50%',
                fontWeight: 'bold',
                fontSize: 15,
                cursor: 'pointer',
                zIndex: 2,
                lineHeight: '10px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={e => {
                e.stopPropagation();
                if (window.confirm('정말 삭제하시겠습니까?')) {
                  onDelete(eq.id);
                }
              }}
              title="장비 삭제"
            >
              ×
            </button>
          )}
        </div>
        {/* 장비 이름 (이미지 바로 아래) */}
        <div
          style={{ width: (pendingSize ? pendingSize.width : imgSize.width), textAlign: 'center', fontWeight: 'bold', fontSize: 13, marginTop: 2, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 1px 2px #222', marginLeft: 'auto', marginRight: 'auto', cursor: 'pointer' }}
          onDoubleClick={e => {
            if (isAdmin && isEditMode) setEdit(true);
          }}
          onClick={e => {
            e.stopPropagation();
            // 상태창을 먼저 닫고 잠시 기다린 후 옵션창 열기
            setShowStatus(false);
            setResizeTargetId(null);
            // DOM 업데이트를 기다린 후 옵션창 열기
            setTimeout(() => {
              setOpenOptionEquipmentId(eq.id);
            }, 10);
          }}
        >
          {isAdmin && isEditMode && edit ? (
            <input
              value={value}
              onChange={e => setValue(e.target.value)}
              onBlur={saveName}
              autoFocus
              style={{ fontSize: 13, width: 70 }}
            />
          ) : (
            eq.name
          )}
        </div>
        {/* 선택된 자재명은 옵션창과 무관하게 항상 장비 이름 아래에 표시 */}
        {selectedOption && (
          <div style={{ color: '#00e676', fontWeight: 'bold', fontSize: 13, marginTop: 2, marginBottom: 2, textAlign: 'center', width: (pendingSize ? pendingSize.width : imgSize.width), marginLeft: 'auto', marginRight: 'auto' }}>{selectedOption}</div>
        )}
        {/* 자재명 입력/추가를 Portal로 렌더링 */}
        {openOptionEquipmentId === eq.id && !showMemo && (() => {
          const equipmentElement = document.querySelector(`[data-equipment-id="${eq.id}"]`);
          if (!equipmentElement) return null;
          
          const rect = equipmentElement.getBoundingClientRect();
          const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
          const scrollY = window.pageYOffset || document.documentElement.scrollTop;
          const left = rect.left + scrollX;
          const top = rect.bottom + scrollY + 5;
          
          return createPortal(
            (isAdmin && isEditMode) ? (
              <div style={{ 
                position: 'absolute', 
                left: `${left}px`, 
                top: `${top}px`, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: 4, 
                width: (pendingSize ? pendingSize.width : imgSize.width), 
                textAlign: 'center', 
                background: '#fff', 
                padding: '8px', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)', 
                border: '2px solid #0074D9', 
                borderRadius: 6,
                zIndex: 999999
              }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, width: '100%' }}>
                  <input
                    type="text"
                    placeholder="자재명"
                    value={optionInput}
                    onChange={e => setOptionInput(e.target.value)}
                    style={{
                      width: 54,
                      height: 24,
                      fontSize: 13,
                      padding: '0 6px',
                      border: '1px solid #bbb',
                      borderRadius: 3,
                      outline: 'none',
                      background: '#fff',
                      color: '#222',
                      textAlign: 'center',
                      marginRight: 2,
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    style={{
                      fontSize: 13,
                      height: 24,
                      minWidth: 32,
                      padding: '0 8px',
                      background: '#0074D9',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 3,
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                      lineHeight: 'normal',
                      whiteSpace: 'nowrap'
                    }}
                    onClick={() => {
                      const value = optionInput.trim();
                      if (!value || options.includes(value)) return;
                      fetch(`http://localhost:3001/api/equipments/${eq.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ options: [...options, value] })
                      })
                      .then(res => res.json())
                      .then(updated => {
                        setOptions(updated.options || []);
                        setOptionInput('');
                        // 🔥 핵심 기능: 자재명 변경 시 어싸인 표 업데이트 (강제 트리거)
                        setTimeout(() => {
                          if (window.globalUpdateAssignmentTableMaterial) {
                            window.globalUpdateAssignmentTableMaterial(eq.name, updated.options || []);
                        console.log(`🔥 자재명 추가: ${eq.name} → ${value}`);
                          }
                        }, 100);
                      });
                    }}
                  >+
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, marginTop: 4, width: '100%', textAlign: 'center' }}>
                  {options.map(opt => (
                    <span key={opt} style={{ display: 'flex', alignItems: 'center', background: '#f0f8ff', color: '#333', borderRadius: 3, padding: '2px 6px', fontSize: 11, margin: '1px 0' }}>
                      {opt}
                      <button style={{ marginLeft: 2, fontSize: 11, color: '#d00', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', lineHeight: 1 }} onClick={e => {
                        e.stopPropagation();
                        if (window.confirm(`"${opt}" 자재명을 삭제하시겠습니까?`)) {
                          const newOptions = options.filter(o => o !== opt);
                          setOptions(newOptions);
                          fetch(`http://localhost:3001/api/equipments/${eq.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ options: newOptions })
                          })
                          .then(res => res.json())
                          .then(updated => {
                            // 🔥 핵심 기능: 자재명 삭제 시 어싸인 표 업데이트 (강제 트리거)
                            setTimeout(() => {
                              if (window.globalUpdateAssignmentTableMaterial) {
                                window.globalUpdateAssignmentTableMaterial(eq.name, newOptions);
                              }
                            console.log(`🔥 자재명 삭제: ${eq.name} → ${opt} 제거`);
                            }, 100);
                          });
                        }
                      }}>×</button>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              options.length > 0 && (
                <div style={{ 
                  position: 'absolute', 
                  left: `${left}px`, 
                  top: `${top}px`, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  width: (pendingSize ? pendingSize.width : imgSize.width), 
                  textAlign: 'center', 
                  background: '#fff', 
                  padding: '8px', 
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)', 
                  border: '2px solid #0074D9', 
                  borderRadius: 6,
                  zIndex: 999999
                }} onClick={e => e.stopPropagation()}>
                  <select
                    value={selectedOption}
                    onChange={handleSelectOption}
                    style={{ fontSize: 12, padding: '2px 6px', borderRadius: 4, minWidth: 60, maxWidth: '100%', width: 'auto', margin: '0 auto', textAlign: 'left', border: '1px solid #0074D9' }}
                  >
                    {options.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              )
            ),
            document.body
          );
        })()}
        {/* 메모 입력창 (모달) */}
        {showMemo && (
          <div
            style={{
              position: 'absolute', left: 30, top: 20, width: 'auto', maxWidth: 400, background: '#fff', color: '#222', border: '1px solid #888', borderRadius: 6, zIndex: (zIndex || 1) + 100, padding: 10, boxShadow: '0 2px 8px #888', display: 'flex', flexDirection: 'column', alignItems: 'stretch', minWidth: 200
            }}
            onClick={e => { handleBringToFront(e); e.stopPropagation(); }}
            onMouseDown={e => { handleBringToFront(e); e.stopPropagation(); }}
            onFocus={handleBringToFront}
          >
            <textarea
              ref={textareaRef}
              value={memo}
              wrap="off"
              onChange={e => {
                setMemo(e.target.value);
                autoResize(e.target);
              }}
              placeholder="장비 특이사항/메모 입력"
              style={{
                width: '100%',
                minWidth: 0,
                maxWidth: '100%',
                minHeight: 60,
                maxHeight: 300,
                marginBottom: 8,
                resize: 'none',
                fontSize: 13,
                fontWeight: 'bold',
                overflow: 'hidden',
                boxSizing: 'border-box',
                lineHeight: 1.5,
                border: 'none',
                borderRadius: 4,
                padding: '2px 8px 6px 8px',
                background: '#fff',
                color: '#222',
                textAlign: 'left',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowMemo(false)} style={{ fontSize: 12 }}>취소</button>
              <button onClick={saveMemo} style={{ fontSize: 12, fontWeight: 'bold', color: '#fff', background: '#d00', border: 'none', borderRadius: 4, padding: '2px 10px' }}>저장</button>
            </div>
          </div>
        )}
        {/* 생산량/정비이력 입력/표시 버튼 */}
        {showStatus && !showMemo && (
          <div style={{ width: (pendingSize ? pendingSize.width : imgSize.width), margin: '0 auto', display: 'flex', justifyContent: 'center' }}>
            <select
              value={eq.status}
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
              onChange={e => {
                e.stopPropagation();
                onStatusChange && onStatusChange(eq.id, e.target.value);
                setTimeout(() => setShowStatus(false), 100);
              }}
              style={{ width: 80, marginTop: 2, fontSize: 12 }}
            >
              {[
                { value: 'running', label: '가동' },
                { value: 'stopped', label: '비가동' },
                { value: 'maint', label: '정비중' },
                { value: 'idle', label: '가동대기' },
              ].map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </Draggable>
  );
}

export default function App() {
  const [equipments, setEquipments] = useState([]);
  const [openMaintId, setOpenMaintId] = useState(null);
  // 1. 상태 분리
  const [processTitles, setProcessTitles] = useState([]); // [{id, title, x, y, _zIndex}]
  const [lineNames, setLineNames] = useState([]); // [{id, name, x, y}]
  const [newProcessTitle, setNewProcessTitle] = useState('');
  const [deleteProcessName, setDeleteProcessName] = useState('');
  const [newLineName, setNewLineName] = useState('');
  const [newEquipmentName, setNewEquipmentName] = useState('');
  const [newEquipmentIconUrl, setNewEquipmentIconUrl] = useState('');
  const [isAdmin, setIsAdmin] = useState(() => {
    const saved = localStorage.getItem('isAdmin');
    return saved === null ? true : saved === 'true';
  }); // true: 관리자, false: 작업자
  const [isEditMode, setIsEditMode] = useState(false); // 편집 모드 상태
  const [currentTeam, setCurrentTeam] = useState(() => {
    return localStorage.getItem('currentTeam') || 'A';
  }); // 현재 선택된 조
  const [chartRefresh, setChartRefresh] = useState(0); // 차트 실시간 업데이트용
  

  
  // 전역에서 차트 새로고침에 접근할 수 있도록 설정
  useEffect(() => {
    window.setChartRefresh = setChartRefresh;
    return () => {
      delete window.setChartRefresh;
    };
  }, []);
  const [zIndexCounter, setZIndexCounter] = useState(100);
  const [activeNode, setActiveNode] = useState(null); // {type: 'process'|'equipment', id}

  // 기존 A조 데이터를 localStorage로 마이그레이션 (최초 1회만)
  useEffect(() => {
    const migrated = localStorage.getItem('dataMigrated');
    if (!migrated && processTitles.length > 0) {
      // 기존 processTitles의 maintenanceHistory를 A조 localStorage로 저장
      processTitles.forEach(process => {
        if (process.maintenanceHistory && process.maintenanceHistory.length > 0) {
          const maintKey = `process_${process.id}_maintenance_A`;
          localStorage.setItem(maintKey, JSON.stringify(process.maintenanceHistory));
        }
      });
      
      // equipments의 memo를 A조 localStorage로 저장
      equipments.forEach(equipment => {
        if (equipment.memo && equipment.memo.trim()) {
          const memoKey = `equipment_${equipment.id}_memo_A`;
          localStorage.setItem(memoKey, equipment.memo);
        }
      });
      
      localStorage.setItem('dataMigrated', 'true');
      console.log('기존 데이터를 A조 localStorage로 마이그레이션 완료');
    }
  }, [processTitles, equipments]);

  // 조 전환시 해당 조의 데이터 로드
  useEffect(() => {
    console.log(`=== 조 전환: ${currentTeam}조로 변경 ===`);
    localStorage.setItem('currentTeam', currentTeam);
    
    // 정비 이력 로드
    if (processTitles.length > 0) {
      console.log(`${currentTeam}조 정비 이력 로드 중... processTitles 개수: ${processTitles.length}`);
      const updatedTitles = processTitles.map(process => {
        const maintKey = `process_${process.id}_maintenance_${currentTeam}`;
        const teamMaintenanceHistory = JSON.parse(localStorage.getItem(maintKey) || '[]');
        console.log(`공정 ${process.id}: ${teamMaintenanceHistory.length}개의 정비 이력 로드`);
        return {
          ...process,
          maintenanceHistory: teamMaintenanceHistory
        };
      });
      setProcessTitles(updatedTitles);
    }

    // 장비 메모, 자재명, 상태 로드 (조별)
    if (equipments.length > 0) {
      console.log(`${currentTeam}조 장비 데이터 로드 중... 장비 개수: ${equipments.length}`);
      const updatedEquipments = equipments.map(equipment => {
        const memoKey = `equipment_${equipment.id}_memo_${currentTeam}`;
        const materialKey = `equipment_${equipment.id}_material_${currentTeam}`;
        const statusKey = `equipment_${equipment.id}_status_${currentTeam}`;
        
        const teamMemo = localStorage.getItem(memoKey) || '';
        const teamMaterial = localStorage.getItem(materialKey) || equipment.selectedOption || '';
        const teamStatus = localStorage.getItem(statusKey);
        
        console.log(`장비 ${equipment.name}(${equipment.id}): 메모 ${teamMemo.length}자, 자재명 ${teamMaterial}, 상태 ${teamStatus}`);
        
        return {
          ...equipment,
          memo: teamMemo,
          selectedOption: teamMaterial,
          status: teamStatus ? parseInt(teamStatus) : equipment.status
        };
      });
      setEquipments(updatedEquipments);
    }

    // 조 전환시 열린 팝업들 모두 닫기
    setOpenOptionEquipmentId(null);
    setOpenStatusEquipmentId(null);
    setResizeTargetId(null);
    setOpenPopup(null);
    
    console.log(`=== ${currentTeam}조 데이터 로드 완료 ===`);
  }, [currentTeam, processTitles.length, equipments.length]);

  useEffect(() => {
    localStorage.setItem('isAdmin', isAdmin);
    // 모드 전환 시 열린 옵션창들 모두 닫기
    setOpenOptionEquipmentId(null);
    setOpenStatusEquipmentId(null);
    setResizeTargetId(null);
  }, [isAdmin]);
  // 장비별 상태창(빨간 점) 열림 여부 관리
  const [equipmentStatusOpen, setEquipmentStatusOpen] = useState({}); // { [id]: bool }

  // 1. App 컴포넌트 상단에 상태 추가
  const [selectedProcessId, setSelectedProcessId] = useState(null);
  const [processYields, setProcessYields] = useState({}); // { [id]: yieldValue }
  const [processSeconds, setProcessSeconds] = useState({}); // { [id]: secondValue }

  // 옵션 입력창 열림 상태 (관리자 모드에서만)
  const [optionInputOpenId, setOptionInputOpenId] = useState(null);

  // 메모 입력창 열림 상태 (장비 모드에서만)
  const [openMemoId, setOpenMemoId] = useState(null);

  // 팝업 관련 상태
  const [openPopup, setOpenPopup] = useState(null); // {type: 'memo'|'maint', id} or null

  // App 컴포넌트 상단에 옵션창 열림 상태 추가
  const [openOptionEquipmentId, setOpenOptionEquipmentId] = useState(null);

  // 상태 옵션창 열림 상태
  const [openStatusEquipmentId, setOpenStatusEquipmentId] = useState(null);

  // 리사이즈 타겟 상태
  const [resizeTargetId, setResizeTargetId] = useState(null);

  // 모든 팝업을 전역으로 관리
  const [popups, setPopups] = useState([]); // [{id, left, top, zIndex, type, data}]
  const [popupZIndexCounter, setPopupZIndexCounter] = useState(10000);

  // 어싸인 현황 관련 상태
  const [showAssignmentStatus, setShowAssignmentStatus] = useState(false);
  const [assignmentTables, setAssignmentTables] = useState(() => {
    const saved = localStorage.getItem('assignmentTables');
    return saved ? JSON.parse(saved) : [];
  });
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0); // 강제 업데이트용
  const [showProductionHistory, setShowProductionHistory] = useState(false); // 생산이력 모달
  
  // 어사인 라인명 관리 (일반 라인명과 분리)
  const [assignmentLineNames, setAssignmentLineNames] = useState(() => {
    const saved = localStorage.getItem('assignmentLineNames');
    return saved ? JSON.parse(saved) : [];
  });
  const [newAssignmentLineName, setNewAssignmentLineName] = useState('');

  // assignmentTables 변경 시 localStorage에 자동 저장
  useEffect(() => {
    localStorage.setItem('assignmentTables', JSON.stringify(assignmentTables));
  }, [assignmentTables]);

  // assignmentLineNames 변경 시 localStorage에 자동 저장
  useEffect(() => {
    localStorage.setItem('assignmentLineNames', JSON.stringify(assignmentLineNames));
  }, [assignmentLineNames]);

  // 🔥 핵심 기능: 장비 상태를 어싸인 표 텍스트로 변환
  const getStatusText = (status) => {
    const statusMap = {
      'running': '가동중',
      'stopped': '비가동', 
      'maint': '정비중',
      'idle': '가동대기'
    };
    return statusMap[status] || status;
  };

  // 🔥 핵심 기능: 장비명으로 어싸인 표 찾기 및 상태 업데이트
  const updateAssignmentTableByEquipment = (equipmentName, newStatus) => {
    if (!equipmentName) return;
    
    const statusText = getStatusText(newStatus);
    
    setAssignmentTables(prevTables => {
      return prevTables.map(table => {
        // 표 제목에 장비명이 포함되어 있는지 확인 (대소문자 무시)
        const titleLower = table.title.toLowerCase();
        const equipmentLower = equipmentName.toLowerCase();
        
        if (titleLower.includes(equipmentLower) || equipmentLower.includes(titleLower.replace(/[^a-z0-9가-힣]/g, ''))) {
          // 해당 표의 데이터에서 "가동중" 관련 셀 찾기 및 업데이트
          const newData = table.data.map((row, rowIndex) => {
            return row.map((cell, colIndex) => {
              // 두 번째 행의 두 번째 열 (가동중/가동일료 칸)인지 확인
              if (rowIndex === 1 && colIndex === 1) {
                return statusText;
              }
              // 기존에 상태 정보가 있는 셀인지 확인 (가동중, 비가동, 정비중, 가동대기 포함)
              if (cell.includes('가동중') || cell.includes('비가동') || 
                  cell.includes('정비중') || cell.includes('가동대기') ||
                  cell.includes('가동')) {
                return statusText;
              }
              return cell;
            });
          });
          
          return { ...table, data: newData };
        }
        
        return table;
      });
    });
  };

  // 🔥 핵심 기능: 자재명으로 어싸인 표 자재명 칸 업데이트 (새로운 방식)
  const updateAssignmentTableMaterial = (equipmentName, materialNames) => {
    if (!equipmentName) return;
    
    const materialText = materialNames && materialNames.length > 0 ? materialNames[0] : '';
    
    setAssignmentTables(prevTables => {
      return prevTables.map(table => {
        // 표 제목에 장비명이 포함되어 있는지 확인
        const titleLower = table.title.toLowerCase();
        const equipmentLower = equipmentName.toLowerCase();
        
        if (titleLower.includes(equipmentLower)) {
          // 🔥 새로운 방식: 사용자가 지정한 자재명 연동 칸들을 업데이트
          if (table.materialCells && table.materialCells.length > 0) {
            const newData = table.data.map((row, rowIndex) => {
              return row.map((cell, colIndex) => {
                const cellKey = `${rowIndex}-${colIndex}`;
                // 자재명 연동 칸으로 지정된 셀인지 확인
                if (table.materialCells.includes(cellKey)) {
                  return materialText || '';
                }
                return cell;
              });
            });
            
            console.log(`🔥 자재명 연동 (새로운 방식): ${equipmentName} → ${materialText}`);
            console.log(`연동 칸들: ${table.materialCells.join(', ')}`);
            // 강제 업데이트를 위해 새 객체 생성
            return { ...table, data: newData, _lastUpdate: Date.now() };
          } else {
            // 🔥 기존 방식: 하위 호환성을 위해 유지
          const newData = table.data.map((row, rowIndex) => {
            return row.map((cell, colIndex) => {
              // 세 번째 행의 두 번째 열 (자재명 값 칸)
              if (rowIndex === 2 && colIndex === 1) {
                return materialText || '';
              }
              return cell;
            });
          });
          
            console.log(`🔥 자재명 연동 (기존 방식): ${equipmentName} → ${materialText}`);
            // 강제 업데이트를 위해 새 객체 생성
            return { ...table, data: newData, _lastUpdate: Date.now() };
          }
        }
        
        return table;
      });
    });
    
    // 강제 업데이트 트리거
    setForceUpdate(prev => prev + 1);
  };

  // 🔥 핵심 기능: 가동상태로 어싸인 표 가동상태 칸 업데이트 (새로운 방식)
  const updateAssignmentTableStatus = (equipmentName, status) => {
    if (!equipmentName) return;
    
    const statusText = status || '대기중';
    
    setAssignmentTables(prevTables => {
      return prevTables.map(table => {
        // 표 제목에 장비명이 포함되어 있는지 확인
        const titleLower = table.title.toLowerCase();
        const equipmentLower = equipmentName.toLowerCase();
        
        if (titleLower.includes(equipmentLower)) {
          // 🔥 새로운 방식: 사용자가 지정한 가동상태 연동 칸들을 업데이트
          if (table.statusCells && table.statusCells.length > 0) {
            const newData = table.data.map((row, rowIndex) => {
              return row.map((cell, colIndex) => {
                const cellKey = `${rowIndex}-${colIndex}`;
                // 가동상태 연동 칸으로 지정된 셀인지 확인
                if (table.statusCells.includes(cellKey)) {
                  return statusText;
                }
                return cell;
              });
            });
            
            console.log(`🔥 가동상태 연동 (새로운 방식): ${equipmentName} → ${statusText}`);
            console.log(`연동 칸들: ${table.statusCells.join(', ')}`);
            // 강제 업데이트를 위해 새 객체 생성
            return { ...table, data: newData, _lastUpdate: Date.now() };
          }
        }
        
        return table;
      });
    });
    
    // 강제 업데이트 트리거
    setForceUpdate(prev => prev + 1);
  };

  // 🔥 전역 함수 설정 (자재명 선택 연동을 위해)
  useEffect(() => {
    console.log('🔥 전역 함수 설정:', typeof updateAssignmentTableMaterial);
    window.globalUpdateAssignmentTableMaterial = updateAssignmentTableMaterial;
    return () => {
      delete window.globalUpdateAssignmentTableMaterial;
    };
  }, [updateAssignmentTableMaterial]);

  // 어사인 라인명 추가 함수
  const addAssignmentLineName = (name) => {
    if (!name || !name.trim()) return;
    
    const newId = Date.now();
    const newAssignmentLineName = {
      id: newId,
      name: name.trim(),
      x: 300 + (Math.random() * 200), // 겹치지 않는 랜덤 위치
      y: 300 + (Math.random() * 100)
    };
    
    setAssignmentLineNames(prev => [...prev, newAssignmentLineName]);
  };

  // 어사인 라인명 이동 함수
  const moveAssignmentLineName = (id, newX, newY) => {
    setAssignmentLineNames(prev => 
      prev.map(line => 
        line.id === id ? { ...line, x: newX, y: newY } : line
      )
    );
  };

  // 어사인 라인명 삭제 함수
  const deleteAssignmentLineName = (id) => {
    setAssignmentLineNames(prev => prev.filter(line => line.id !== id));
  };

  // 🔥 완전히 새로운 생산이력 수집 함수 - 개별 블록 단위로 수집
  const collectDetailedProductionHistory = (team = 'ALL') => {
    const detailedHistory = [];
    const now = new Date();
    
    // 조별 필터링을 위한 배열 설정
    const teamsToProcess = team === 'ALL' ? ['A', 'B', 'C'] : [team];
    
    // 🔥 1. 공정별로 작업자가 입력한 개별 생산량 블록들 수집
    processTitles.forEach(process => {
      teamsToProcess.forEach(currentTeam => {
        // 🔥 새로운 상세 블록 데이터 가져오기 (우선순위)
        const productionHistoryKey = `process_${process.id}_production_blocks_${currentTeam}`;
        const savedProductionBlocks = JSON.parse(localStorage.getItem(productionHistoryKey) || '[]');
        
        if (savedProductionBlocks.length > 0) {
          // 저장된 생산 블록 데이터 사용
          // 🔥 중복 제거: 이 부분 비활성화
          /*savedProductionBlocks.forEach((block, blockIndex) => {
            detailedHistory.push({
              type: '생산량',
            team: currentTeam,
            processTitle: process.title,
            processId: process.id,
              blockIndex: blockIndex + 1,
              blockId: block.id || block.blockId,
              equipmentName: '-',
              productionValue: block.yieldValue,
              materialName: block.secondValue || '-',
              content: `생산량: ${block.yieldValue}${block.secondValue ? `, 자재: ${block.secondValue}` : ''}`,
              maintenanceInfo: {
                eqNo: block.maintEqNo || '-',
                description: block.maintDesc || '-',
                startTime: block.maintStart || '-',
                endTime: block.maintEnd || '-'
              },
              downtimeInfo: {
                startTime: block.downStart || '-',
                endTime: block.downEnd || '-', 
                reason: block.downReason || '-'
              },
              timestamp: block.savedAt || block.timestamp || now.toISOString(),
              category: 'production_block'
          });
        });*/
        }
        
        // 🔥 A. 생산량 블록 데이터 수집 (중복 방지)
        const blocksKey = `process_${process.id}_blocks_${currentTeam}`;
        const savedBlocks = JSON.parse(localStorage.getItem(blocksKey) || '[]');
        
        // 🔥 B. 해당 공정의 정비이력들을 블록과 연결하여 수집
        const maintKey = `process_${process.id}_maintenance_${currentTeam}`;
        const maintenanceHistory = JSON.parse(localStorage.getItem(maintKey) || '[]');
        
        // 🔥 C. 생산량 블록 이력 추가 (한 번만)
        savedBlocks.forEach((block, blockIndex) => {
          if (block.yieldValue && block.yieldValue !== '') {
            detailedHistory.push({
              type: '생산량',
              team: currentTeam,
              processTitle: process.title,
              processId: process.id,
              blockIndex: blockIndex + 1,
              blockId: block.id,
              equipmentName: '-',
              productionValue: block.yieldValue,
              materialName: block.secondValue || '-',
              content: `생산량: ${block.yieldValue}${block.secondValue ? `, 자재: ${block.secondValue}` : ''}`,
              timestamp: block.savedAt || now.toISOString(),
              category: 'production_block'
            });
          }
        });
        
        // 🔥 D. 공정명 노드와 동일한 정비이력 그룹화 방식 적용
        // 각 블록별로 정비이력 그룹화 처리
        savedBlocks.forEach((block, blockIndex) => {
          // 해당 블록의 정비이력들 찾기
          const blockMaints = maintenanceHistory
            .map((m, originalIndex) => ({ ...m, originalIndex }))
            .filter(m => m.blockIndex === blockIndex || (m.blockIndex === undefined && blockIndex === 0));
          
          // 메인 이력(추가가 아닌 것)들만 찾기
          const mainMaints = blockMaints.filter(m => !m._addedByPlus);
          
          // 각 메인 이력별로 그룹 처리
          mainMaints.forEach((mainM) => {
            // 이 메인 이력에서 플러스로 추가한 것들 찾기
            const plusMaints = blockMaints.filter(m => 
              m._addedByPlus && m._groupSource === mainM.originalIndex
            );
            
            // 메인 이력 + 플러스 추가 이력들의 총 시간 계산
            const groupMaints = [mainM, ...plusMaints];
            const totalGroupTime = groupMaints.reduce((sum, m) => {
              if (typeof m.time === 'number' && !isNaN(m.time)) return sum + m.time;
              const match = m.description && m.description.match(/(\d{2}):(\d{2})~(\d{2}):(\d{2})/);
              if (match) {
                const sh = parseInt(match[1], 10), sm = parseInt(match[2], 10);
                const eh = parseInt(match[3], 10), em = parseInt(match[4], 10);
                let min = (eh - sh) * 60 + (em - sm);
                if (!isNaN(min) && min < 0) min += 24 * 60;
                if (!isNaN(min) && min >= 0) return sum + min;
              }
              return sum;
            }, 0);
            
            // 🔥 개별 정비이력만 추가 (깔끔하게 정리)
            groupMaints.forEach((maint, maintIndex) => {
              const isFirstInGroup = maintIndex === 0; // 그룹의 첫 번째 이력
              // 정비시간 정확히 계산
              let calculatedTime = 0;
              if (typeof maint.time === 'number' && !isNaN(maint.time)) {
                calculatedTime = maint.time;
              } else {
                const match = maint.description && maint.description.match(/(\d{2}):(\d{2})~(\d{2}):(\d{2})/);
                if (match) {
                  const sh = parseInt(match[1], 10), sm = parseInt(match[2], 10);
                  const eh = parseInt(match[3], 10), em = parseInt(match[4], 10);
                  let min = (eh - sh) * 60 + (em - sm);
                  if (!isNaN(min) && min < 0) min += 24 * 60;
                  if (!isNaN(min) && min >= 0) calculatedTime = min;
                }
              }
              
              // 시간 범위 추출
              const timeMatch = maint.description && maint.description.match(/(\d{2}:\d{2}~\d{2}:\d{2})/);
              const timeRange = timeMatch ? timeMatch[1] : '-';
              const description = maint.description ? maint.description.replace(/\d{2}:\d{2}~\d{2}:\d{2}\s*/, '') : '-';
              
              detailedHistory.push({
                type: maint._addedByPlus ? '정비이력(추가)' : '정비이력',
            team: currentTeam,
            processTitle: process.title,
            processId: process.id,
                blockIndex: blockIndex + 1,
                blockId: block.id,
                equipmentName: maint.eqNo || '-',
                productionValue: '-',
                materialName: '-',
                content: maint.description || '-',
                maintenanceTime: calculatedTime,
                maintenanceInfo: {
                  eqNo: maint.eqNo || '-',
                  description: description,
                  time: calculatedTime,
                  timeRange: timeRange,
                  isAddedByPlus: maint._addedByPlus || false,
                  groupSource: maint._groupSource,
                  // 🔥 그룹 정보 추가 (첫 번째 이력에만)
                  isFirstInGroup: isFirstInGroup,
                  groupTotalTime: isFirstInGroup ? totalGroupTime : null,
                  groupSize: isFirstInGroup ? groupMaints.length : null
                },
                timestamp: maint.timestamp || now.toISOString(),
                category: 'maintenance_detail'
          });
        });
      });
    });

        // 🔥 E. 해당 공정의 비가동이력들 수집 (완전 별도 처리)
        const downKey = `process_${process.id}_downtime_${currentTeam}`;
        const downtimeHistory = JSON.parse(localStorage.getItem(downKey) || '[]');
        
        downtimeHistory.forEach((downtime, downIndex) => {
          // 🔥 비가동시간 정확히 계산
          let calculatedTime = 0;
          if (typeof downtime.time === 'number' && !isNaN(downtime.time)) {
            calculatedTime = downtime.time;
          } else {
            // description에서 시간 범위를 찾아서 계산
            const match = downtime.description && downtime.description.match(/(\d{2}):(\d{2})~(\d{2}):(\d{2})/);
            if (match) {
              const sh = parseInt(match[1], 10), sm = parseInt(match[2], 10);
              const eh = parseInt(match[3], 10), em = parseInt(match[4], 10);
              let min = (eh - sh) * 60 + (em - sm);
              if (!isNaN(min) && min < 0) min += 24 * 60;
              if (!isNaN(min) && min >= 0) calculatedTime = min;
            }
          }
          
          // 시간 범위 추출
          const timeMatch = downtime.description && downtime.description.match(/(\d{2}:\d{2}~\d{2}:\d{2})/);
          const timeRange = timeMatch ? timeMatch[1] : '-';
          const reason = downtime.reason || (downtime.description ? downtime.description.replace(/\d{2}:\d{2}~\d{2}:\d{2}\s*/, '') : '-');
          
          detailedHistory.push({
            type: '비가동이력',
            team: currentTeam,
            processTitle: process.title,
            processId: process.id,
            blockIndex: (downtime.blockIndex !== undefined ? downtime.blockIndex + 1 : '-'),
            blockId: downtime.blockId || '-',
            equipmentName: '-',
            productionValue: '-',
            materialName: '-',
            content: downtime.description || '-',
            downtimeTime: calculatedTime,
            downtimeInfo: {
              reason: reason,
              time: calculatedTime,
              timeRange: timeRange
            },
            timestamp: downtime.timestamp || now.toISOString(),
            category: 'downtime_detail'
          });
        });
      });
    });

    // 🔥 4. 장비별 자재명 현황 수집
    equipments.forEach(eq => {
      teamsToProcess.forEach(currentTeam => {
        const materialKey = `equipment_${eq.id}_material_${currentTeam}`;
        const materialValue = localStorage.getItem(materialKey) || eq.selectedOption;
        
        if (materialValue && materialValue !== '') {
          detailedHistory.push({
            type: '장비자재',
            team: currentTeam,
            processTitle: '장비관련',
            processId: null,
            blockIndex: '-',
            blockId: '-',
            equipmentName: eq.name,
            productionValue: '-',
            materialName: materialValue,
            content: `${eq.name} 자재: ${materialValue}`,
            timestamp: now.toISOString(),
            category: 'equipment_material'
          });
        }
      });
    });

    // 공정별, 블록별 정렬
    return detailedHistory.sort((a, b) => {
      // 1차: 공정명으로 정렬
      if (a.processTitle !== b.processTitle) {
        return a.processTitle.localeCompare(b.processTitle);
      }
      // 2차: 블록 인덱스로 정렬
      if (a.blockIndex !== b.blockIndex) {
        const aBlock = parseInt(a.blockIndex) || 999;
        const bBlock = parseInt(b.blockIndex) || 999;
        return aBlock - bBlock;
      }
      // 3차: 시간순 정렬 (최신순)
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  };

  // 팝업 열기 (무조건 맨 위로)
  const showPopup = (e, id, type, data = {}) => {
    const rect = e.target.getBoundingClientRect();
    setPopupZIndexCounter(z => {
      setPopups(prev => [
        ...prev.filter(p => p.id !== id),
        {
          id,
          left: rect.left,
          top: rect.bottom + 4,
          zIndex: z + 1,
          type,
          data
        }
      ]);
      return z + 1;
    });
  };

  // 팝업을 맨 위로 올리기
  const bringPopupToFront = (id) => {
    setPopupZIndexCounter(z => {
      setPopups(prev =>
        prev.map(p =>
          p.id === id ? { ...p, zIndex: z + 1 } : p
        )
      );
      return z + 1;
    });
  };

  // 팝업 닫기
  const closePopup = (id) => {
    setPopups(prev => prev.filter(p => p.id !== id));
  };

  useEffect(() => {
    loadEquipments();
    // 공정명 데이터 불러오기
    fetch('http://localhost:3001/api/processTitles')
      .then(r => r.json())
      .then(data => {
        console.log('Loaded processTitles data:', data);
        setProcessTitles(data);
        // yield 값 초기화
        const yields = {};
        const seconds = {};
        data.forEach(t => {
          if (typeof t.yield !== 'undefined') {
            yields[t.id] = t.yield;
          }
          if (typeof t.secondField !== 'undefined') {
            seconds[t.id] = t.secondField;
          }
        });
        setProcessYields(yields);
        setProcessSeconds(seconds);
      })
      .catch(err => {
        console.error('Error loading processTitles:', err);
      });
    // 라인명 데이터 불러오기
    fetch('http://localhost:3001/api/lineNames')
      .then(r => r.json())
      .then(setLineNames);

    socket.on('initialEquipments', data => setEquipments(data));
    socket.on('equipmentAdded', newEq => setEquipments(prev => [...prev, newEq]));
    socket.on('equipmentUpdated', updated => {
      setEquipments(prev => prev.map(eq => eq.id === updated.id ? updated : eq));
    });
    socket.on('equipmentDeleted', id => {
      setEquipments(prev => prev.filter(eq => eq.id !== id));
    });
    socket.on('statusUpdate', ({ id, status }) => {
      setEquipments(prev => prev.map(eq => eq.id === id ? { ...eq, status } : eq));
    });
    // 공정명 실시간 동기화(옵션)
    // socket.on('processTitlesUpdated', setProcessTitles);
    // 라인명 실시간 동기화(옵션)
    // socket.on('lineNamesUpdated', setLineNames);

    return () => socket.disconnect();
  }, []);
  // 공정명 추가
  const addProcessTitle = (title) => {
    const centerX = window.innerWidth / 2;
    const centerY = 30 + 16; // 대략 타이틀 높이 절반 보정(16)
    const gridX = Math.round(centerX / GRID_SIZE) * GRID_SIZE;
    const gridY = Math.round(centerY / GRID_SIZE) * GRID_SIZE;
    fetch('http://localhost:3001/api/processTitles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, x: gridX, y: gridY })
    })
      .then(res => res.json())
      .then(newTitle => {
        setProcessTitles(titles => [...titles, newTitle]);
      });
  };
  // 라인명 추가
  const addLineName = (name) => {
    const centerX = window.innerWidth / 2;
    const centerY = 80 + 16; // 대략 라인명 높이 절반 보정(16)
    const gridX = Math.round(centerX / GRID_SIZE) * GRID_SIZE;
    const gridY = Math.round(centerY / GRID_SIZE) * GRID_SIZE;
    fetch('http://localhost:3001/api/lineNames', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, x: gridX, y: gridY })
    })
      .then(res => res.json())
      .then(newLine => {
        setLineNames(lines => [...lines, newLine]);
      });
  };

  // 공정명 이동
  const moveProcessTitle = (id, x, y) => {
    const gridX = Math.round((x + 30) / GRID_SIZE) * GRID_SIZE - 30; // 대략 타이틀 박스 절반 보정(30)
    const gridY = Math.round((y + 16) / GRID_SIZE) * GRID_SIZE - 16;
    setProcessTitles(titles => titles.map(t => t.id === id ? { ...t, x: gridX, y: gridY } : t));
    fetch(`http://localhost:3001/api/processTitles/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ x: gridX, y: gridY })
    });
  };
  // 라인명 이동
  const moveLineName = (id, x, y) => {
    const gridX = Math.round((x + 30) / GRID_SIZE) * GRID_SIZE - 30;
    const gridY = Math.round((y + 16) / GRID_SIZE) * GRID_SIZE - 16;
    setLineNames(lines => lines.map(l => l.id === id ? { ...l, x: gridX, y: gridY } : l));
    fetch(`http://localhost:3001/api/lineNames/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x: gridX, y: gridY }),
    })
    .catch(err => console.error('라인명 위치 저장 실패', err));
  };

  // 공정명 삭제
  const deleteProcessTitle = (id) => {
    setProcessTitles(titles => titles.filter(t => t.id !== id));
    fetch(`http://localhost:3001/api/processTitles/${id}`, { method: 'DELETE' });
  };
  // 라인명 삭제
  const deleteLineName = (id) => {
    setLineNames(lines => lines.filter(l => l.id !== id));
    fetch(`http://localhost:3001/api/lineNames/${id}`, {
      method: 'DELETE',
    })
    .catch(err => console.error('라인명 삭제 실패', err));
  };

  // 공정명 수정 (현재는 타이틀만 수정 가능)
  const editProcessTitle = (id, title) => {
    setProcessTitles(titles => titles.map(t => t.id === id ? { ...t, title } : t));
    fetch(`http://localhost:3001/api/processTitles/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title })
    });
  };

  // 공정별 정비이력 추가 함수 (조별 localStorage 사용)
  const addProcessMaint = (processId, newMaint) => {
    console.log(`=== 정비 이력 추가: ${currentTeam}조 ===`, { processId, newMaint });
    
    const targetProcess = processTitles.find(t => t.id === processId);
    if (!targetProcess) return;

    // 현재 조의 정비 이력 가져오기
    const maintKey = `process_${processId}_maintenance_${currentTeam}`;
    const existingHistory = JSON.parse(localStorage.getItem(maintKey) || '[]');
    const newHistory = [...existingHistory, newMaint];
    
    console.log(`${currentTeam}조 정비 이력 저장:`, { maintKey, 기존개수: existingHistory.length, 새로운개수: newHistory.length });
    
    // localStorage에 저장
    localStorage.setItem(maintKey, JSON.stringify(newHistory));

    // UI 업데이트
    const updatedProcess = { ...targetProcess, maintenanceHistory: newHistory };
    setProcessTitles(titles => titles.map(t => t.id === processId ? updatedProcess : t));
    
    // 차트 실시간 업데이트 트리거
    setChartRefresh(prev => prev + 1);

    // === 장비 메모 연동 (똑똑한 매칭) ===
    if (newMaint.eqNo) {
      console.log(`=== ${currentTeam}조 메모 연동 시작 ===`, { eqNo: newMaint.eqNo });
      
      // 입력된 장비명 정리 (공백 제거, 소문자 변환)
      const inputEqName = newMaint.eqNo.trim().toLowerCase();
      
      // 1. 정확한 매칭 시도
      let matchedEqs = equipments.filter(e => e.name.trim().toLowerCase() === inputEqName);
      
      // 2. 정확한 매칭이 없으면 부분 매칭 시도
      if (matchedEqs.length === 0) {
        matchedEqs = equipments.filter(e => 
          e.name.trim().toLowerCase().includes(inputEqName) || 
          inputEqName.includes(e.name.trim().toLowerCase())
        );
      }
      
                      console.log(`장비 "${newMaint.eqNo}" 검색 결과: ${matchedEqs.length}개 매칭`, matchedEqs.map(e => e.name));
        
        if (matchedEqs.length === 0) {
          console.warn(`⚠️ 장비 "${newMaint.eqNo}"를 찾을 수 없습니다. 메모 연동이 건너뛰어집니다.`);
          const availableEqs = equipments.map(e => e.name).join(', ');
          console.log(`사용 가능한 장비 목록: ${availableEqs}`);
        }
        
        matchedEqs.forEach(eq => {
        // 정비이력 내용 포맷 (공백 없이 통일, 줄바꿈 포함)
        let maintText = '';
        const match = newMaint.description.match(/(\d{2}:\d{2}~\d{2}:\d{2})\s*(.*)/);
        if (match) {
          maintText = `${newMaint._addedByPlus ? '[추가]' : '[정비이력]'} ${match[1]} ${match[2]}`.trim();
        } else {
          maintText = `${newMaint._addedByPlus ? '[추가]' : '[정비이력]'} ${newMaint.description}`.trim();
        }
        
        // 메모장에 줄바꿈 추가 (조별 localStorage 사용)
        const memoKey = `equipment_${eq.id}_memo_${currentTeam}`;
        const currentMemo = localStorage.getItem(memoKey) || '';
        const newMemo = (currentMemo && currentMemo.trim() ? currentMemo.trim() + '\n' : '') + maintText;
        
        console.log(`${currentTeam}조 메모 업데이트:`, { 
          장비: eq.name, 
          memoKey, 
          기존메모길이: currentMemo.length, 
          새메모길이: newMemo.length,
          추가내용: maintText
        });
        
        // localStorage에 저장
        localStorage.setItem(memoKey, newMemo);
        
        // UI 업데이트 - 메모 실시간 반영을 위해 memoRefresh 증가
        setEquipments(eqs => eqs.map(e => e.id === eq.id ? { 
          ...e, 
          memo: newMemo,
          memoRefresh: (e.memoRefresh || 0) + 1
        } : e));
      });
      
      console.log(`=== ${currentTeam}조 메모 연동 완료 ===`);
    } else {
      console.log(`eqNo가 없어서 메모 연동 생략:`, newMaint);
    }
    // === 장비 메모 연동 후, 서버에서 최신 equipments를 다시 받아와 동기화 ===
    // (이 부분 전체 삭제)
  };

  // 공정별 정비이력 삭제 함수 (조별 localStorage 사용)
  const deleteProcessMaint = (processId, indexToDelete) => {
    if (!window.confirm('삭제하겠습니까?')) return;
    const targetProcess = processTitles.find(t => t.id === processId);
    if (!targetProcess) return;

    // 현재 조의 정비 이력 가져오기
    const maintKey = `process_${processId}_maintenance_${currentTeam}`;
    const existingHistory = JSON.parse(localStorage.getItem(maintKey) || '[]');
    const deletedMaint = existingHistory[indexToDelete];
    const newHistory = existingHistory.filter((_, i) => i !== indexToDelete);
    
    // localStorage에 저장
    localStorage.setItem(maintKey, JSON.stringify(newHistory));

    // UI 업데이트
    const updatedProcess = { ...targetProcess, maintenanceHistory: newHistory };
    setProcessTitles(titles => titles.map(t => t.id === processId ? updatedProcess : t));
    
    // 차트 실시간 업데이트 트리거
    setChartRefresh(prev => prev + 1);

    // === 장비 메모 연동: 정비이력 삭제 시 메모에서도 해당 줄 삭제 ===
    if (deletedMaint && deletedMaint.eqNo) {
      const eqName = deletedMaint.eqNo;
      const matchedEqs = equipments.filter(e => e.name === eqName);
      // 정비이력 내용 포맷 (추가와 동일하게)
      let maintText = '';
      const match = deletedMaint.description.match(/(\d{2}:\d{2}~\d{2}:\d{2})\s*(.*)/);
      if (match) {
        maintText = `${deletedMaint._addedByPlus ? '[추가]' : '[정비이력]'} ${match[1]} ${match[2]}`.trim();
      } else {
        maintText = `${deletedMaint._addedByPlus ? '[추가]' : '[정비이력]'} ${deletedMaint.description}`.trim();
      }
      // 모든 장비의 메모를 조별로 업데이트
      matchedEqs.forEach(eq => {
        const memoKey = `equipment_${eq.id}_memo_${currentTeam}`;
        const currentMemo = localStorage.getItem(memoKey) || '';
        const newMemo = currentMemo.split('\n').filter(line => line.trim() !== maintText).join('\n');
        
        // localStorage에 저장
        localStorage.setItem(memoKey, newMemo);
      });
      
      // UI 업데이트 - 메모 실시간 반영을 위해 memoRefresh 증가
      setEquipments(eqs =>
        eqs.map(e =>
          e.name === eqName
            ? { 
                ...e, 
                memo: localStorage.getItem(`equipment_${e.id}_memo_${currentTeam}`) || '',
                memoRefresh: (e.memoRefresh || 0) + 1
              }
            : e
        )
      );
    }
  };

  // 그리드 간격 및 장비 이미지 크기 상수
  const GRID_SIZE = 70;
  const EQUIP_WIDTH = 80;
  const EQUIP_HEIGHT = 60;

  // 1. 장비 추가 시 x, y를 그리드 교차점에 맞춰서(중심 보정 포함) 추가
  const addEquipment = eq => {
    // 항상 화면 가운데 상단에 고정 위치로 추가
    const centerX = window.innerWidth / 2;
    const gridX = Math.round(centerX / GRID_SIZE) * GRID_SIZE - EQUIP_WIDTH / 2;
    const gridY = Math.round((100 + EQUIP_HEIGHT / 2) / GRID_SIZE) * GRID_SIZE - EQUIP_HEIGHT / 2;
    const newEq = { ...eq, x: gridX, y: gridY };
    fetch('http://localhost:3001/api/equipments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEq),
    });
  };

  // 2. 장비 이동 시 그리드 교차점에 중심이 오도록 스냅
  function moveEquipment(id, x, y) {
    // 중심이 가장 가까운 그리드 교차점에 오도록 보정
    const snappedX = Math.round((x + EQUIP_WIDTH / 2) / GRID_SIZE) * GRID_SIZE - EQUIP_WIDTH / 2;
    const snappedY = Math.round((y + EQUIP_HEIGHT / 2) / GRID_SIZE) * GRID_SIZE - EQUIP_HEIGHT / 2;
    fetch(`http://localhost:3001/api/equipments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x: snappedX, y: snappedY })
    })
      .then(res => res.json())
      .then(updated => {
        setEquipments(eqs => eqs.map(eq => eq.id === id ? updated : eq));
      });
  }

  const deleteEquipment = id => {
    fetch(`http://localhost:3001/api/equipments/${id}`, { method: 'DELETE' });
  };

  const changeStatus = (id, status, maint) => {
    // 🔥 핵심 기능: 장비명 찾기 (상태 변경 전)
    const targetEquipment = equipments.find(eq => eq.id === id);
    const equipmentName = targetEquipment?.name;

    console.log(`🔥 장비 상태 변경: ${equipmentName} → ${getStatusText(status)}`);

    // 🔥 조별 장비 상태 저장
    const statusKey = `equipment_${id}_status_${currentTeam}`;
    localStorage.setItem(statusKey, status.toString());
    console.log(`🔥 조별 장비 상태 저장: ${statusKey} = ${status}`);

    // 정비 이력 추가
    if (maint && maint.time !== undefined && maint.description) {
      setEquipments(eqs => eqs.map(eq => {
        if (eq.id !== id) return eq;
        const history = Array.isArray(eq.maintenanceHistory) ? eq.maintenanceHistory : [];
        // 서버에도 전체 이력 배열을 저장
        fetch(`http://localhost:3001/api/equipments/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, maintenanceHistory: [...history, maint] })
        })
        .then(res => res.json())
        .then(updated => {
          setEquipments(eqs => eqs.map(eq => eq.id === id ? updated : eq));
          // 🔥 핵심 기능: 어싸인 표 업데이트 (강제 트리거)
          if (equipmentName) {
            setTimeout(() => {
            updateAssignmentTableByEquipment(equipmentName, status);
              // 🔥 새로운 기능: 가동상태 연동
              updateAssignmentTableStatus(equipmentName, getStatusText(status));
              console.log(`🔥 상태 변경 연동: ${equipmentName} → ${getStatusText(status)}`);
            }, 100);
          }
        });
        return {
          ...eq,
          status,
          maintenanceHistory: [...history, maint]
        };
      }));
    } else {
      fetch(`http://localhost:3001/api/equipments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      .then(res => res.json())
      .then(updated => {
        setEquipments(eqs => eqs.map(eq => eq.id === id ? updated : eq));
        // 🔥 핵심 기능: 어싸인 표 업데이트 (강제 트리거)
        if (equipmentName) {
          setTimeout(() => {
          updateAssignmentTableByEquipment(equipmentName, status);
            // 🔥 새로운 기능: 가동상태 연동
            updateAssignmentTableStatus(equipmentName, getStatusText(status));
            console.log(`🔥 상태 변경 연동: ${equipmentName} → ${getStatusText(status)}`);
          }, 100);
        }
      });
    }
  };

  // 생산량 저장 함수 (조별 저장 + 이력 저장 추가)
  const saveProcessYield = (id, value) => {
    setProcessYields(yields => ({ ...yields, [id]: value }));
    setProcessTitles(titles => titles.map(t => t.id === id ? { ...t, yield: value } : t));
    
    // 🔥 조별 생산량 저장
    const yieldKey = `process_${id}_yield_${currentTeam}`;
    localStorage.setItem(yieldKey, value);
    console.log(`🔥 조별 생산량 저장: ${yieldKey} = ${value}`);
    
    // 🔥 생산량 이력 저장 (따로 구분)
    if (value && value !== '0' && value !== '') {
      const yieldHistoryKey = `process_${id}_yield_history_${currentTeam}`;
      const existingHistory = JSON.parse(localStorage.getItem(yieldHistoryKey) || '[]');
      const newEntry = {
        value: value,
        timestamp: new Date().toISOString()
      };
      const updatedHistory = [...existingHistory, newEntry];
      localStorage.setItem(yieldHistoryKey, JSON.stringify(updatedHistory));
      console.log(`🔥 생산량 이력 저장: ${yieldHistoryKey} 에 ${value} 추가`);
    }
    
    fetch(`http://localhost:3001/api/processTitles/${id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yield: value })
      }
    );
  };

  // 추가값 저장 함수 (조별 저장 + 이력 저장 추가)
  const saveProcessSecond = (id, value) => {
    setProcessSeconds(seconds => ({ ...seconds, [id]: value }));
    setProcessTitles(titles => titles.map(t => t.id === id ? { ...t, secondField: value } : t));
    
    // 🔥 조별 추가값 저장
    const secondFieldKey = `process_${id}_secondField_${currentTeam}`;
    localStorage.setItem(secondFieldKey, value);
    console.log(`🔥 조별 추가값 저장: ${secondFieldKey} = ${value}`);
    
    // 🔥 추가값 이력 저장 (따로 구분)
    if (value && value !== '0' && value !== '') {
      const additionalHistoryKey = `process_${id}_additional_history_${currentTeam}`;
      const existingHistory = JSON.parse(localStorage.getItem(additionalHistoryKey) || '[]');
      const newEntry = {
        value: value,
        timestamp: new Date().toISOString()
      };
      const updatedHistory = [...existingHistory, newEntry];
      localStorage.setItem(additionalHistoryKey, JSON.stringify(updatedHistory));
      console.log(`🔥 추가값 이력 저장: ${additionalHistoryKey} 에 ${value} 추가`);
    }
    
    fetch(`http://localhost:3001/api/processTitles/${id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secondField: value })
      }
    );
  };

  // handleSetSecondValue 함수 추가
  const handleSetSecondValue = (id, val) => {
    if ((!isAdmin) || (isAdmin && isEditMode)) saveProcessSecond(id, val);
  };

  // updateTitleField 함수 추가
  const updateTitleField = (id, field, value) => {
    if ((!isAdmin) || (isAdmin && isEditMode)) {
      setProcessTitles(titles => titles.map(t => t.id === id ? { ...t, [field]: value } : t));
      fetch(`http://localhost:3001/api/processTitles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
    }
  };

  // 창을 맨 위로 올리는 함수 (배열 순서로)
  const bringToFront = (type, id) => {
    if (type === 'process') {
      setProcessTitles(titles => {
        const idx = titles.findIndex(t => t.id === id);
        if (idx === -1) return titles;
        const item = titles[idx];
        return [...titles.slice(0, idx), ...titles.slice(idx + 1), item];
      });
    } else if (type === 'equipment') {
      setEquipments(eqs => {
        const idx = eqs.findIndex(eq => eq.id === id);
        if (idx === -1) return eqs;
        const item = eqs[idx];
        return [...eqs.slice(0, idx), ...eqs.slice(idx + 1), item];
      });
    }
  };

  return (
    <>
      {/* 중앙상단 장비 상태불빛 및 이름 legend 완전 주석처리 */}
      {false && (
        <div style={{
          display: 'flex', flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 32, position: 'relative', width: '100%', margin: '0 auto', marginBottom: 8, marginTop: 8, zIndex: 100
        }}>
          {/* 가동 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{
              display: 'inline-block',
              width: 6, height: 6, borderRadius: '50%',
              background: 'green',
              border: '1px solid #888',
              boxShadow: '0 0 12px 6px green, 0 0 24px 12px green'
            }} />
            <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 10, marginTop: 4 }}>가동</span>
          </div>
          {/* 비가동 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{
              display: 'inline-block',
              width: 6, height: 6, borderRadius: '50%',
              background: 'orange',
              border: '1px solid #888',
              boxShadow: '0 0 12px 6px orange, 0 0 24px 12px orange'
            }} />
            <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 10, marginTop: 4 }}>비가동</span>
          </div>
          {/* 정비중 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{
              display: 'inline-block',
              width: 6, height: 6, borderRadius: '50%',
              background: 'red',
              border: '1px solid #888',
              boxShadow: '0 0 12px 6px red, 0 0 24px 12px red'
            }} />
            <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 10, marginTop: 4 }}>정비중</span>
          </div>
          {/* 가동대기 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{
              display: 'inline-block',
              width: 6, height: 6, borderRadius: '50%',
              background: 'yellow',
              border: '1px solid #888',
              boxShadow: '0 0 12px 6px yellow, 0 0 24px 12px yellow'
            }} />
            <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 10, marginTop: 4 }}>가동대기</span>
          </div>
        </div>
      )}
      {/* 중앙상단 장비 상태불빛 및 이름 legend 완전 주석처리 끝 */}
      {/* 상단 컨트롤 패널 */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        padding: '15px 25px',
        marginBottom: 20,
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* 모드 전환 버튼 */}
          <button 
            onClick={() => {
              setOpenOptionEquipmentId(null);
              setOpenStatusEquipmentId(null);
              setResizeTargetId(null);
              setIsAdmin(a => !a);
              setIsEditMode(false);
            }}
            style={{
              background: isAdmin 
                ? 'linear-gradient(135deg, #ff6b6b, #ee5a52)' 
                : 'linear-gradient(135deg, #4ecdc4, #44a08d)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
            }}
          >
            <span style={{ fontSize: '16px' }}>
              {isAdmin ? '🔧' : '👤'}
            </span>
            {isAdmin ? 'MANAGER MODE' : 'USER MODE'}
          </button>

          {/* 현재 모드 표시 */}
          <div style={{
            background: isAdmin ? 'rgba(255,107,107,0.2)' : 'rgba(78,205,196,0.2)',
            color: isAdmin ? '#ff6b6b' : '#4ecdc4',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            border: `1px solid ${isAdmin ? '#ff6b6b' : '#4ecdc4'}`
          }}>
            {isAdmin ? '⚡ 관리자 권한' : ' Operator mode'}
          </div>

          {/* 수정 버튼 (관리자만) */}
          {isAdmin && (
            <button 
              onClick={() => setIsEditMode(prev => !prev)}
              style={{
                background: isEditMode 
                  ? 'linear-gradient(135deg, #ff9a9e, #fecfef)' 
                  : 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
              }}
            >
              <span style={{ fontSize: '14px' }}>
                {isEditMode ? '✅' : '✏️'}
              </span>
              {isEditMode ? '편집 완료' : '편집 모드'}
            </button>
          )}

          {/* 어싸인 현황 버튼 (관리자만) */}
          {isAdmin && (
            <button 
              onClick={() => setShowAssignmentStatus(prev => !prev)}
              style={{
                background: showAssignmentStatus 
                  ? 'linear-gradient(135deg, #20bf6b, #01a3a4)' 
                  : 'linear-gradient(135deg, #3742fa, #2f3542)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
              }}
            >
              <span style={{ fontSize: '14px' }}>
                {showAssignmentStatus ? '' : ''}
              </span>
              어싸인 현황
            </button>
          )}

          {/* 생산이력 버튼 (관리자만) */}
          {isAdmin && (
            <button 
              onClick={() => setShowProductionHistory(prev => !prev)}
              style={{
                background: showProductionHistory 
                  ? 'linear-gradient(135deg, #f39c12, #e67e22)' 
                  : 'linear-gradient(135deg, #8e44ad, #9b59b6)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
              }}
            >
              <span style={{ fontSize: '14px' }}>
                {showProductionHistory ? '📋' : '📄'}
              </span>
              생산이력
            </button>
          )}
        </div>

        {/* 시스템 정보 */}
        <div style={{
          color: 'rgba(255,255,255,0.8)',
          fontSize: '11px',
          textAlign: 'right'
        }}>
          <div style={{ fontWeight: '600' }}> Smart Factory MES</div>
          <div style={{ opacity: 0.7 }}>Production Management System</div>
        </div>
      </div>

      {/* 🛠️ 전문적인 편집 도구 패널 (편집 모드에서만) */}
      {isAdmin && isEditMode && (
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '20px',
          marginBottom: 20,
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(102,126,234,0.3)',
          border: '1px solid rgba(255,255,255,0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* 홀로그램 오버레이 */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(118,75,162,0.1) 100%)',
            pointerEvents: 'none'
          }} />

          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '15px',
            zIndex: 1,
            position: 'relative'
          }}>
            <span style={{ fontSize: '18px', marginRight: '8px' }}>🛠️</span>
            <h3 style={{ margin: 0, color: 'white', fontWeight: '600', fontSize: '16px' }}>
              FACTORY MANAGEMENT TOOLS
            </h3>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '20px',
            zIndex: 1,
            position: 'relative'
          }}>
            {/* 장비 추가 카드 */}
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '10px',
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '15px'
              }}>
                <span style={{ fontSize: '16px', marginRight: '8px' }}>⚙️</span>
                <h4 style={{ margin: 0, color: 'white', fontSize: '14px', fontWeight: '600' }}>
                  장비 추가
                </h4>
              </div>
              <form onSubmit={e => {
                e.preventDefault();
                if (!newEquipmentName) return;
                addEquipment({ name: newEquipmentName, iconUrl: newEquipmentIconUrl, x: 100, y: 100 });
                setNewEquipmentName(''); 
                setNewEquipmentIconUrl('');
              }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                                   <input
                    className="professional-input"
                    placeholder="장비 이름"
                    value={newEquipmentName}
                    onChange={e => setNewEquipmentName(e.target.value)}
                    required
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.3)',
                      background: 'rgba(255,255,255,0.1)',
                      color: 'white',
                      fontSize: '14px',
                      outline: 'none',
                      backdropFilter: 'blur(5px)'
                    }}
                    onFocus={(e) => e.target.style.border = '1px solid rgba(255,110,199,0.5)'}
                    onBlur={(e) => e.target.style.border = '1px solid rgba(255,255,255,0.3)'}
                  />
                <input
                  placeholder="아이콘 URL"
                  value={newEquipmentIconUrl}
                  onChange={e => setNewEquipmentIconUrl(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none',
                    backdropFilter: 'blur(5px)'
                  }}
                />
                <button type="submit" style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ff6ec7, #0052cc)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(255,110,199,0.3)'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(255,110,199,0.4)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 15px rgba(255,110,199,0.3)';
                }}>
                  ➕ 장비 추가
                </button>
              </form>
            </div>

            {/* 공정명 추가 카드 */}
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '10px',
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '15px'
              }}>
                <span style={{ fontSize: '16px', marginRight: '8px' }}>📋</span>
                <h4 style={{ margin: 0, color: 'white', fontSize: '14px', fontWeight: '600' }}>
                  공정명 추가
                </h4>
              </div>
              <form onSubmit={e => { 
                e.preventDefault(); 
                if (newProcessTitle) { 
                  addProcessTitle(newProcessTitle); 
                  setNewProcessTitle(''); 
                } 
              }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  placeholder="공정명(LINE)"
                  value={newProcessTitle}
                  onChange={e => setNewProcessTitle(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none',
                    backdropFilter: 'blur(5px)'
                  }}
                />
                <button type="submit" style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}>
                  + 추가
                </button>
              </form>
            </div>

            {/* 공정명 삭제 카드 */}
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '10px',
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '15px'
              }}>
                <span style={{ fontSize: '16px', marginRight: '8px' }}>🗑️</span>
                <h4 style={{ margin: 0, color: 'white', fontSize: '14px', fontWeight: '600' }}>
                  공정명 삭제
                </h4>
              </div>
              <form onSubmit={e => { 
                e.preventDefault(); 
                if (deleteProcessName) { 
                  const targetProcess = processTitles.find(p => p.title === deleteProcessName);
                  if (targetProcess) {
                    deleteProcessTitle(targetProcess.id);
                    setDeleteProcessName('');
                    alert(`공정 "${deleteProcessName}"이 삭제되었습니다.`);
                  } else {
                    alert(`공정 "${deleteProcessName}"을 찾을 수 없습니다.`);
                  }
                } 
              }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  placeholder="삭제할 공정명 입력 (예: C/A)"
                  value={deleteProcessName}
                  onChange={e => setDeleteProcessName(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none',
                    backdropFilter: 'blur(5px)'
                  }}
                />
                <button type="submit" style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}>
                  🗑️ 삭제
                </button>
              </form>
            </div>

            {/* 라인명 추가 카드 */}
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '10px',
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '15px'
              }}>
                <span style={{ fontSize: '16px', marginRight: '8px' }}></span>
                <h4 style={{ margin: 0, color: 'white', fontSize: '14px', fontWeight: '600' }}>
                  라인명 추가
                </h4>
              </div>
              <form onSubmit={e => { 
                e.preventDefault(); 
                if (newLineName) { 
                  addLineName(newLineName); 
                  setNewLineName(''); 
                } 
              }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  placeholder="공정명"
                  value={newLineName}
                  onChange={e => setNewLineName(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.3)',
                    background: 'rgba(255,255,255,0.1)',
                    color: 'white',
                    fontSize: '14px',
                    outline: 'none',
                    backdropFilter: 'blur(5px)'
                  }}
                />
                <button type="submit" style={{
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #ff6ec7, #0052cc)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(255,110,199,0.3)'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(255,110,199,0.4)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 15px rgba(255,110,199,0.3)';
                }}>
                  ➕ 라인 추가
                </button>
              </form>
            </div>
                     </div>

           {/* CSS for placeholder text styling */}
           <style>
             {`
               .professional-input::placeholder {
                 color: rgba(255,255,255,0.6) !important;
               }
               .professional-input:focus::placeholder {
                 color: rgba(255,255,255,0.4) !important;
               }
             `}
           </style>
         </div>
       )}

       {/* 📊 공정별 시간 분석 차트 패널 - 상단에서 제거 */}
       
       {/* 팀 선택 패널 - 회사 브랜딩 (분홍💖파랑💙) */}
      <div style={{
        background: 'linear-gradient(135deg, #ff6ec7 0%, #0066ff 100%)',
        padding: '20px 30px',
        marginBottom: 20,
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(255,110,199,0.4)',
        border: '1px solid rgba(255,255,255,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '25px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* 홀로그램 오버레이 효과 */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
                     background: 'linear-gradient(45deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(0,102,255,0.1) 100%)',
          pointerEvents: 'none'
        }} />
        {/* 팀 선택 레이블 */}
        <div style={{
          color: '#ffffff',
          fontSize: '16px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '18px' }}>👥</span>
          TEAM SELECT
        </div>

        {/* 팀 버튼들 */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {['A', 'B', 'C'].map(team => (
            <button
              key={team}
              onClick={() => setCurrentTeam(team)}
              style={{
                background: currentTeam === team 
                  ? 'linear-gradient(135deg, #ff1493 0%, #0052cc 100%)'
                  : 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)',
                color: 'white',
                border: 'none',
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: currentTeam === team 
                  ? '0 8px 25px rgba(255,20,147,0.5)'
                  : '0 4px 15px rgba(255,255,255,0.2)',
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px'
              }}
              onMouseOver={(e) => {
                if (currentTeam !== team) {
                  e.target.style.background = 'linear-gradient(135deg, #ff69b4 0%, #003d99 100%)';
                }
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.boxShadow = '0 12px 30px rgba(255,105,180,0.5)';
              }}
              onMouseOut={(e) => {
                if (currentTeam !== team) {
                  e.target.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)';
                }
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = currentTeam === team 
                  ? '0 8px 25px rgba(255,20,147,0.5)'
                  : '0 4px 15px rgba(255,255,255,0.2)';
              }}
            >
              <div style={{ fontSize: '24px', lineHeight: '1' }}>{team}</div>
              <div style={{ fontSize: '10px', opacity: 0.8 }}>TEAM</div>
            </button>
          ))}
        </div>

        {/* 현재 선택된 팀 표시 */}
        <div style={{
          background: 'linear-gradient(135deg, #ff1493 0%, #0052cc 100%)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '25px',
          fontSize: '14px',
          fontWeight: '600',
          boxShadow: '0 4px 15px rgba(255,20,147,0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: '2px solid rgba(255,255,255,0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* 반짝이는 효과 */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
            animation: 'shine 3s infinite',
            pointerEvents: 'none'
          }} />
          <span style={{ fontSize: '16px', zIndex: 1 }}></span>
          <span style={{ zIndex: 1 }}>ACTIVE: {currentTeam} TEAM</span>
        </div>

        <style>
          {`
            @keyframes shine {
              0% { left: -100%; }
              100% { left: 100%; }
            }
          `}
        </style>
      </div>
      
      {/* 전문적인 편집 도구들은 상단으로 이동 */}
      <div style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        minHeight: '100vh',
        backgroundColor: '#2a2a2a',
        overflow: 'auto'
      }}
      onClick={() => {
        setOpenStatusEquipmentId(null); // 바탕화면 클릭 시 상태창 닫힘
        setOpenOptionEquipmentId(null); // 자재 옵션창도 닫힘
        setResizeTargetId(null); // 바탕화면 클릭 시 이모티콘 숨김
        setOpenPopup(null); // 모든 공정 노드 팝업을 닫습니다.
      }}>
        {/* SVG 그리드 패턴 */}
        {/* 그리드는 편집 모드에서만 표시 */}
        {isAdmin && isEditMode && (
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 0,
              pointerEvents: 'none'
            }}
          >
            <defs>
              <pattern
                id="grid"
                width="70"
                height="70"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 70 0 L 0 0 0 70"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        )}
        
        {/* 3. 공정명(타이틀) 노드들 */}
        {processTitles.map((item) => (
          <ProcessTitleNode
            key={item.id}
            id={item.id}
            title={item.title}
            x={item.x}
            y={item.y}
            yieldValue={item.yield}
            secondValue={item.secondField}  // ✅ 이게 핵심
            setYieldValue={(val) => {
              setProcessTitles(titles =>
                titles.map(t =>
                  t.id === item.id ? { ...t, yield: val } : t
                )
              );
            }}
            setSecondValue={(val) => {
              setProcessTitles(titles =>
                titles.map(t =>
                  t.id === item.id ? { ...t, secondField: val } : t
                )
              );
            }}
            isAdmin={isAdmin}
            isEditMode={isEditMode}
            currentTeam={currentTeam}
            onMove={moveProcessTitle}
            onEdit={editProcessTitle}
            onDelete={deleteProcessTitle}
            onClick={e => {
              bringToFront('process', item.id);
              if (e) e.stopPropagation(); // 배경 클릭 이벤트가 전파되지 않도록 막습니다.
              setOpenOptionEquipmentId(null);
              setOpenStatusEquipmentId(null);
              setResizeTargetId(null);
            }}
            lineName={item.lineName}
            maintenanceHistory={item.maintenanceHistory}
            onAddMaint={addProcessMaint}
            onDeleteMaint={deleteProcessMaint}
            equipments={equipments}
            showMaint={openPopup?.type === 'maint' && openPopup.id === item.id}
            setShowMaint={show => {
              setOpenPopup(show ? { type: 'maint', id: item.id } : null);
              // "생산량" 버튼 클릭 시 장비 옵션창 닫기
              if (show) {
                setOpenOptionEquipmentId(null); // 자재 옵션창 닫기
                setOpenStatusEquipmentId(null); // 상태창 닫기
                setResizeTargetId(null);        // 이모티콘도 닫기
              }
            }}
            zIndex={item._zIndex || 1}
            openPopup={openPopup}
            setOpenPopup={setOpenPopup}
            lastSaved={item.lastSaved}
            materialNames={item.materialNames || []}
            onAddMaterialName={(name) => {
              const newMaterialNames = [...(item.materialNames || []), name];
              fetch(`http://localhost:3001/api/processTitles/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ materialNames: newMaterialNames })
              });
            }}
            onRemoveMaterialName={(index) => {
              const newMaterialNames = (item.materialNames || []).filter((_, i) => i !== index);
              fetch(`http://localhost:3001/api/processTitles/${item.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ materialNames: newMaterialNames })
              });
            }}
          />
        ))}
        {/* 4. 라인명 노드들 */}
        {lineNames.map(l => (
          <LineNameNode
            key={l.id}
            {...l}
            isAdmin={isAdmin}
            isEditMode={isEditMode}
            onMove={moveLineName}
            onDelete={deleteLineName}
          />
        ))}


        {/* 4. 장비 노드들 */}
        {equipments.map(eq => (
          <EquipmentNode
            key={eq.id}
            eq={eq}
            onMove={isAdmin ? moveEquipment : () => {}}
            onDelete={isAdmin ? deleteEquipment : () => {}}
            onStatusChange={changeStatus}
            isAdmin={isAdmin}
            isEditMode={isEditMode}
            equipments={equipments}
            setEquipments={setEquipments}
            processTitles={processTitles}
            showStatus={openStatusEquipmentId === eq.id}
            setShowStatus={open => {
              if (open) setOpenStatusEquipmentId(eq.id);
              else setOpenStatusEquipmentId(null);
            }}
            onClick={e => {
              bringToFront('equipment', eq.id);
              if (isAdmin) setOptionInputOpenId(eq.id);
              if (e) e.stopPropagation();

              setOpenOptionEquipmentId(eq.id); // 장비 클릭 시 옵션창 열림 id 갱신
            }}
            zIndex={eq._zIndex || 1}
            optionInputOpen={optionInputOpenId === eq.id}
            showMaint={!!eq._showMaint}
            setShowMaint={show => setEquipments(eqs => eqs.map(e => e.id === eq.id ? { ...e, _showMaint: show } : e))}
            showMemo={openPopup?.type === 'memo' && openPopup.id === eq.id}
            setShowMemo={show => setOpenPopup(show ? { type: 'memo', id: eq.id } : null)}
            openPopup={openPopup}
            setOpenPopup={setOpenPopup}
            showOptionBox={openOptionEquipmentId === eq.id}
            setShowOptionBox={open => setOpenOptionEquipmentId(open ? eq.id : null)}
            openOptionEquipmentId={openOptionEquipmentId}
            setOpenOptionEquipmentId={setOpenOptionEquipmentId}
            resizeTargetId={resizeTargetId}
            setResizeTargetId={setResizeTargetId}
            showPopup={showPopup}
            setPopups={setPopups}
            currentTeam={currentTeam}
            memoRefresh={eq.memoRefresh || 0}
          />
        ))}
      </div>

      {/* 어싸인 현황 패널 (관리자 모드에서만 표시) */}
      {isAdmin && showAssignmentStatus && (
        <div style={{
          position: 'relative',
          width: '100vw',
          height: '100vh',
          minHeight: '100vh',
          backgroundColor: '#2a2a2a',
          backgroundImage: `
            linear-gradient(to right, rgba(128, 128, 128, 0.3) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(128, 128, 128, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          overflow: 'auto',
          marginBottom: '20px'
        }}>
          {/* 컨트롤 패널 */}
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            zIndex: 1000,
            display: 'flex',
            gap: '10px'
          }}>
            <button 
              onClick={() => setShowAddTableModal(true)}
              style={{
                background: 'linear-gradient(135deg, #20bf6b, #01a3a4)',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600'
              }}
            >
              + 새 표 추가
            </button>
            {/* 라인명 추가 */}
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '10px',
              padding: '15px',
              border: '1px solid rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              marginBottom: '10px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '10px'
              }}>
                <span style={{ fontSize: '14px', marginRight: '6px' }}>🏭</span>
                <h4 style={{ margin: 0, color: 'white', fontSize: '12px', fontWeight: '600' }}>
                  라인명 추가 (어사인 배치도)
                </h4>
              </div>
              <form onSubmit={e => { 
                e.preventDefault(); 
                if (newAssignmentLineName && newAssignmentLineName.trim()) { 
                  addAssignmentLineName(newAssignmentLineName); 
                  setNewAssignmentLineName(''); 
                } 
              }} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={newAssignmentLineName}
                  onChange={(e) => setNewAssignmentLineName(e.target.value)}
                  placeholder="어사인 라인명 입력..."
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    fontSize: '12px'
                  }}
                />
                <button 
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #20bf6b, #01a3a4)',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: '600'
                  }}
                >
                  추가
                </button>
              </form>
            </div>


          </div>

          {/* 어사인 라인명들 */}
          {assignmentLineNames.map(lineName => (
            <DraggableAssignmentLineName
              key={lineName.id}
              lineName={lineName}
              onMove={moveAssignmentLineName}
              onDelete={deleteAssignmentLineName}
            />
          ))}

          {/* 어싸인 현황 표들 */}
          {assignmentTables.map(table => (
            <DraggableAssignmentTable
              key={table.id}
              table={table}
              onUpdateTable={(updatedTable) => {
                setAssignmentTables(prev => 
                  prev.map(t => t.id === table.id ? updatedTable : t)
                );
              }}
              onDeleteTable={() => {
                if (window.confirm('이 표를 삭제하시겠습니까?')) {
                  setAssignmentTables(prev => prev.filter(t => t.id !== table.id));
                }
              }}
            />
          ))}

          {/* 표 없을 때 안내 메시지 */}
          {assignmentTables.length === 0 && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: 'rgba(255,255,255,0.7)'
            }}>
              <span style={{ fontSize: '48px', display: 'block', marginBottom: '10px' }}>📋</span>
              <p style={{ margin: 0, fontSize: '16px' }}>
                "새 표 추가" 버튼을 눌러 첫 번째 표를 만들어보세요
              </p>
            </div>
          )}

          {/* 표 추가 모달 */}
          {showAddTableModal && (
            <CompactAddTableModal 
              onClose={() => setShowAddTableModal(false)}
              onCreateTable={(tableData) => {
                // 표 데이터 생성 (다양한 표 구조 지원)
                const tableRows = Array(tableData.rows || 1).fill().map((_, rowIndex) => {
                  const columnCount = tableData.rowColumns ? tableData.rowColumns[rowIndex] : 3;
                  // 모든 셀을 빈 문자열로 시작 (사용자가 자유롭게 입력)
                  return Array(columnCount).fill('');
                });

                // 자동 높이 계산
                const headerHeight = 25;
                const controlHeight = 0; // 초기에는 편집모드 아님
                const rowHeight = 24;
                const padding = 8;
                const contentHeight = headerHeight + controlHeight + (tableRows.length * rowHeight) + padding;
                const autoHeight = Math.min(Math.max(contentHeight, 55), 300); // 최소 높이를 55로 수정

                // 초기 위치를 그리드에 맞춰 계산 (기존 표들과 겹치지 않게)
                const gridSize = 50;
                const width = tableData.width || 300;
                
                // 기존 표들과 겹치지 않는 위치 찾기
                const findAvailablePosition = () => {
                  const startX = 200;
                  const startY = 100;
                  const maxAttempts = 100; // 최대 시도 횟수
                  
                  for (let attempt = 0; attempt < maxAttempts; attempt++) {
                    const offsetX = (attempt % 10) * gridSize * 2; // 가로로 2칸씩 이동
                    const offsetY = Math.floor(attempt / 10) * gridSize * 2; // 세로로 2칸씩 이동
                    
                    const candidateX = startX + offsetX;
                    const candidateY = startY + offsetY;
                    
                    // 중심점을 그리드에 스냅
                    const centerX = candidateX + width / 2;
                    const centerY = candidateY + autoHeight / 2;
                    const snappedCenterX = Math.round(centerX / gridSize) * gridSize;
                    const snappedCenterY = Math.round(centerY / gridSize) * gridSize;
                    const snappedX = snappedCenterX - width / 2;
                    const snappedY = snappedCenterY - autoHeight / 2;
                    
                    // 기존 표들과 겹치는지 확인
                    const isOverlapping = assignmentTables.some(existingTable => {
                      const buffer = 10; // 여유 공간
                      return !(
                        snappedX + width + buffer < existingTable.x ||
                        snappedX > existingTable.x + existingTable.width + buffer ||
                        snappedY + autoHeight + buffer < existingTable.y ||
                        snappedY > existingTable.y + (existingTable.height || 120) + buffer
                      );
                    });
                    
                    if (!isOverlapping) {
                      return { x: snappedX, y: snappedY };
                    }
                  }
                  
                  // 적절한 위치를 찾지 못한 경우 기본 위치 반환
                  const centerX = startX + width / 2;
                  const centerY = startY + autoHeight / 2;
                  const snappedCenterX = Math.round(centerX / gridSize) * gridSize;
                  const snappedCenterY = Math.round(centerY / gridSize) * gridSize;
                  return { 
                    x: snappedCenterX - width / 2, 
                    y: snappedCenterY - autoHeight / 2 
                  };
                };
                
                const { x: snappedX, y: snappedY } = findAvailablePosition();

                const newTable = {
                  id: `table_${Date.now()}`,
                  title: tableData.title || `새 표`,
                  x: snappedX,
                  y: snappedY,
                  width: width,
                  height: autoHeight, // 자동 계산된 높이 사용
                  data: tableRows
                };
                setAssignmentTables(prev => [...prev, newTable]);
                setShowAddTableModal(false);
              }}
            />
          )}
        </div>
      )}

              {/* 📋 상세 생산이력 모달 */}
      {showProductionHistory && (
          <DetailedProductionHistoryModal 
          onClose={() => setShowProductionHistory(false)}
            collectDetailedProductionHistory={collectDetailedProductionHistory}
          currentTeam={currentTeam}
        />
      )}

      {/* 📊 공정별 시간 분석 차트 패널 - 관리자 모드에서만 표시 */}
      {isAdmin && (
      <div style={{
        background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
        padding: '20px',
        marginTop: 20,
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(44,62,80,0.3)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '20px',
          color: 'white'
        }}>
          <span style={{ fontSize: '20px', marginRight: '10px' }}>📊</span>
          <h2 style={{ 
            margin: 0, 
            fontSize: '18px', 
            fontWeight: '700' 
          }}>
            {currentTeam}조 공정별 시간 분석 (8시간 근무 기준)
          </h2>
        </div>
        
        {/* 공정별 차트 그리드 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          justifyItems: 'center'
        }}>
          {processTitles
            .sort((a, b) => {
              const equipA = extractEquipmentName(a.title);
              const equipB = extractEquipmentName(b.title);
              return equipA.localeCompare(equipB);
            })
            .map((processTitle, index, sortedArray) => {
            const processData = analyzeProcessTime(processTitle, currentTeam);
              const currentEquip = extractEquipmentName(processTitle.title);
              const prevEquip = index > 0 ? extractEquipmentName(sortedArray[index - 1].title) : null;
              const showGroupLabel = currentEquip !== prevEquip;
              
            return (
                <div key={`${processTitle.id}-${currentTeam}-${chartRefresh}`} style={{ 
                  position: 'relative'
                }}>
                  
                  
                  {showGroupLabel && (
                    <div style={{ 
                      fontSize: '15px', 
                      color: '#667eea', 
                      fontWeight: '600',
                      position: 'absolute',
                      top: '5px',
                      left: '5px',
                      zIndex: 2,
                      background: 'rgba(255,255,255,0.9)',
                      padding: '2px 4px',
                      borderRadius: '3px'
                    }}>
                      {currentEquip}
                    </div>
                  )}
                  <ProcessTimeChart processData={processData} />
                </div>
            );
          })}
          
          {/* 공정이 없을 때 안내 메시지 */}
          {processTitles.length === 0 && (
            <div style={{
              textAlign: 'center',
              color: 'rgba(255,255,255,0.7)',
              padding: '40px',
              gridColumn: '1 / -1'
            }}>
              <span style={{ fontSize: '48px', display: 'block', marginBottom: '10px' }}>📋</span>
              <p style={{ margin: 0, fontSize: '16px' }}>
                공정을 추가하면 시간 분석 차트가 표시됩니다
              </p>
              {isAdmin && isEditMode && (
                <p style={{ margin: '10px 0 0 0', fontSize: '14px', opacity: 0.8 }}>
                  상단의 편집 도구에서 "공정명 추가"를 사용해보세요
                </p>
              )}
            </div>
          )}
        </div>
        
        {/* 범례 설명 */}
        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '8px',
          color: 'rgba(255,255,255,0.8)',
          fontSize: '12px'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#FF6B6B', borderRadius: '50%' }}></div>
              <span>🔧 정비시간: 장비 정비 작업 시간</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#4ECDC4', borderRadius: '50%' }}></div>
              <span>⚡ 가동시간: 정상 생산 작업 시간 (추후 추가)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#FFE66D', borderRadius: '50%' }}></div>
                             <span>⏸️ 비가동시간: 대기/정지 시간</span>
            </div>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <div style={{ width: '12px', height: '12px', backgroundColor: '#4CAF50', borderRadius: '50%' }}></div>
               <span>🟢 가동시간: 8시간 중 실제 가동하는 시간</span>
             </div>
          </div>
                 </div>
       </div>
       )}
     </>
   );
 }

function loadEquipments() {
  try {
    // fs, path import 구문 삭제
    // if (!fs.existsSync(DATA_FILE)) {
    //   fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
    // }
    // const data = fs.readFileSync(DATA_FILE, 'utf-8');
    // equipments = JSON.parse(data);
  } catch (e) {
    console.error('equipments 파일 로드 오류:', e);
    // equipments = []; // 파일 로드 실패 시 빈 배열 사용
  }
}

// 8. 라인명 노드 컴포넌트
function LineNameNode({ name, x, y, id, isAdmin, isEditMode, onMove, onDelete }) {
  return (
    <Draggable
      position={{ x, y }}
      onStop={(e, data) => isAdmin && isEditMode && onMove(id, data.x, data.y)}
      disabled={!(isAdmin && isEditMode)}
      key={id + '-' + x + '-' + y}
    >
      <div style={{ position: 'absolute', zIndex: 10, minWidth: 60, background: '#000', color: '#fff', border: '1px solid #bbb', borderRadius: 4, padding: '2px 8px', textAlign: 'center', boxShadow: '0 1px 4px #ccc', fontWeight: 'bold', fontSize: 14 }}>
        <span>{name}</span>
        {isAdmin && isEditMode && (
          <button style={{ marginLeft: 6, fontSize: 10 }} onClick={() => { if (window.confirm('삭제하겠습니까?')) onDelete(id); }}>X</button>
        )}
      </div>
    </Draggable>
  );
}

// 어사인 라인명 컴포넌트 (드래그 가능)
function DraggableAssignmentLineName({ lineName, onMove, onDelete }) {
  return (
    <Draggable
      key={lineName.id}
      defaultPosition={{ x: lineName.x, y: lineName.y }}
      onStop={(e, data) => onMove(lineName.id, data.x, data.y)}
      handle=".assignment-line-name-handle"
    >
      <div
        style={{
          position: 'absolute',
          background: 'linear-gradient(135deg, #20bf6b, #01a3a4)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'move',
          userSelect: 'none',
          boxShadow: '0 4px 12px rgba(32, 191, 107, 0.3)',
          border: '2px solid rgba(255,255,255,0.2)',
          minWidth: '80px',
          textAlign: 'center',
          zIndex: 50
        }}
        className="assignment-line-name-handle"
        onDoubleClick={() => {
          if (window.confirm(`"${lineName.name}" 라인명을 삭제하시겠습니까?`)) {
            onDelete(lineName.id);
          }
        }}
      >
         {lineName.name}
      </div>
    </Draggable>
  );
}

// 9. 드래그 가능한 어싸인 표 컴포넌트 (행 기준)
function DraggableAssignmentTable({ table, onUpdateTable, onDeleteTable }) {
  const [editingCell, setEditingCell] = useState(null);
  const [cellValue, setCellValue] = useState('');
  const [isEditMode, setIsEditMode] = useState(false); // 편집모드 상태

  const [materialCells, setMaterialCells] = useState([]); // 자재명 연동 칸들
  const [statusCells, setStatusCells] = useState([]); // 가동상태 연동 칸들



  // 표 로드 시 저장된 연동 칸 정보 불러오기
  useEffect(() => {
    if (table.materialCells) {
      setMaterialCells(table.materialCells);
    }
    if (table.statusCells) {
      setStatusCells(table.statusCells);
    }
  }, [table.materialCells, table.statusCells]);

  const handleCellEdit = (rowIndex, colIndex, value) => {
    setEditingCell({ row: rowIndex, col: colIndex });
    setCellValue(value);
  };

  const handleCellChange = (value) => {
    setCellValue(value);
    // 실시간 자동 저장
    if (editingCell) {
      const newData = [...table.data];
      newData[editingCell.row][editingCell.col] = value;
      onUpdateTable({ ...table, data: newData });
    }
  };

  const handleCellFinish = () => {
    setEditingCell(null);
    setCellValue('');
  };



  // 자재명 연동 칸으로 지정
  const setAsMaterialCell = (rowIndex, colIndex) => {
    const cellKey = `${rowIndex}-${colIndex}`;
    if (!materialCells.includes(cellKey)) {
      const newMaterialCells = [...materialCells, cellKey];
      setMaterialCells(newMaterialCells);
      // 표 데이터에 연동 칸 정보 저장
      onUpdateTable({ 
        ...table, 
        materialCells: newMaterialCells,
        statusCells: statusCells 
      });
    }

  };

  // 가동상태 연동 칸으로 지정
  const setAsStatusCell = (rowIndex, colIndex) => {
    const cellKey = `${rowIndex}-${colIndex}`;
    if (!statusCells.includes(cellKey)) {
      const newStatusCells = [...statusCells, cellKey];
      setStatusCells(newStatusCells);
      // 표 데이터에 연동 칸 정보 저장
      onUpdateTable({ 
        ...table, 
        materialCells: materialCells,
        statusCells: newStatusCells 
      });
    }

  };



  const addRow = () => {
    const maxColumns = Math.max(...table.data.map(row => row.length));
    const newRow = Array(Math.max(1, Math.floor(maxColumns / 2))).fill(''); // 빈 문자열로 시작
    const newData = [...table.data, newRow];
    
    // 높이는 자동으로 조정되므로 height 업데이트 제거
    onUpdateTable({ ...table, data: newData });
  };

  const deleteRow = (rowIndex) => {
    if (table.data.length <= 1) {
      alert('최소 1개의 행은 있어야 합니다.');
      return;
    }
    const newData = table.data.filter((_, i) => i !== rowIndex);
    
    // 높이는 자동으로 조정되므로 height 업데이트 제거
    onUpdateTable({ ...table, data: newData });
  };

  const addCellToRow = (rowIndex) => {
    const newData = [...table.data];
    newData[rowIndex] = [...newData[rowIndex], '']; // 빈 문자열로 시작
    onUpdateTable({ ...table, data: newData });
  };

  const deleteCellFromRow = (rowIndex, colIndex) => {
    if (table.data[rowIndex].length <= 1) {
      alert('각 행에는 최소 1개의 셀이 있어야 합니다.');
      return;
    }
    const newData = [...table.data];
    newData[rowIndex] = newData[rowIndex].filter((_, i) => i !== colIndex);
    onUpdateTable({ ...table, data: newData });
  };

  // 최대 열 개수 계산 (colspan 계산용)
  const maxColumns = Math.max(...table.data.map(row => row.length), 1);

  // 표 높이 자동 계산 (내용에 맞게)
  const calculateAutoHeight = () => {
    const headerHeight = 25; // 표 헤더 높이
    const controlHeight = isEditMode ? 25 : 0; // 편집 컨트롤 높이
    const rowHeight = 24; // 각 행의 예상 높이
    const padding = 8; // 상하 패딩
    
    const contentHeight = headerHeight + controlHeight + (table.data.length * rowHeight) + padding;
    const minHeight = 55; // 최소 높이를 줄여서 1행짜리도 컴팩트하게
    
    return Math.max(contentHeight, minHeight); // 최대 높이 제한 제거
  };

  const autoHeight = calculateAutoHeight();

  // 그리드 스냅 함수 (표의 중심을 그리드 교차점에 맞춤)
  const snapToGrid = (x, y, width, height) => {
    const gridSize = 50;
    
    // 표의 중심점 계산
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    // 중심점을 그리드에 스냅
    const snappedCenterX = Math.round(centerX / gridSize) * gridSize;
    const snappedCenterY = Math.round(centerY / gridSize) * gridSize;
    
    // 스냅된 중심점에서 좌상단 위치 계산
    const snappedX = snappedCenterX - width / 2;
    const snappedY = snappedCenterY - height / 2;
    
    return { x: snappedX, y: snappedY };
  };

  return (
    <Draggable
      position={{ x: table.x, y: table.y }}
      onStop={(e, data) => {
        // 그리드에 스냅된 위치 계산
        const snappedPosition = snapToGrid(data.x, data.y, table.width, autoHeight);
        onUpdateTable({ ...table, x: snappedPosition.x, y: snappedPosition.y });
      }}
      handle=".table-header"
    >
      <div 
        style={{
          position: 'absolute',
          width: table.width,
          minHeight: autoHeight, // 최소 높이로 변경하여 자동 확장 허용
          background: 'white',
          border: '2px solid #333',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          overflow: 'visible', // 내용이 보이도록 변경
          fontSize: '10px',
          zIndex: 200 // 라인명(100)보다 높게 설정
        }}

      >
        {/* 표 헤더 (드래그 핸들) */}
        <div 
          className="table-header"
          style={{
            background: '#ffeb3b', // 모든 공정명을 노란색으로 통일
            color: 'black',
            padding: '6px 8px',
            fontWeight: 'bold',
            fontSize: '11px',
            textAlign: 'center',
            cursor: 'move',
            position: 'relative'
          }}
        >
          {table.title}
          
          {/* 편집모드 토글 버튼 */}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            style={{
              position: 'absolute',
              top: '2px',
              right: '24px',
              background: isEditMode ? '#f39c12' : '#34495e',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              width: '16px',
              height: '16px',
              fontSize: '8px',
              cursor: 'pointer'
            }}
          >
            ✏️
          </button>
          
          {/* 삭제 버튼 */}
          <button
            onClick={onDeleteTable}
            style={{
              position: 'absolute',
              top: '2px',
              right: '4px',
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '16px',
              height: '16px',
              fontSize: '10px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        {/* 표 컨트롤 (편집모드일 때만 표시) */}
        {isEditMode && (
          <div style={{
            padding: '4px 6px',
            background: '#ecf0f1',
            borderBottom: '1px solid #bdc3c7',
            display: 'flex',
            gap: '4px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={addRow}
              style={{
                background: '#27ae60',
                color: 'white',
                border: 'none',
                padding: '2px 6px',
                borderRadius: '3px',
                fontSize: '9px',
                cursor: 'pointer'
              }}
            >
              + 행
            </button>
          </div>
        )}

        {/* 실제 표 (HTML table 사용) */}
        <div style={{ 
          overflow: 'visible', 
          minHeight: 'fit-content',
          padding: '4px'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '9px'
          }}>
            <tbody>
              {table.data.map((row, rowIndex) => (
                <tr key={rowIndex} style={{ position: 'relative' }}>
                  {/* 행 컨트롤 (편집모드일 때만 표시) */}
                  {isEditMode && (
                    <td style={{
                      width: '20px',
                      background: '#f8f9fa',
                      border: '1px solid #dee2e6',
                      textAlign: 'center',
                      padding: '2px',
                      verticalAlign: 'middle'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                        <button
                          onClick={() => addCellToRow(rowIndex)}
                          style={{
                            background: '#3498db',
                            color: 'white',
                            border: 'none',
                            borderRadius: '2px',
                            width: '12px',
                            height: '12px',
                            fontSize: '8px',
                            cursor: 'pointer'
                          }}
                          title="이 행에 열 추가"
                        >
                          +
                        </button>
                        <button
                          onClick={() => deleteRow(rowIndex)}
                          style={{
                            background: '#e74c3c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '2px',
                            width: '12px',
                            height: '12px',
                            fontSize: '8px',
                            cursor: 'pointer'
                          }}
                          title="이 행 삭제"
                        >
                          -
                        </button>
                      </div>
                    </td>
                  )}

                  {/* 실제 데이터 셀들 */}
                  {row.map((cell, colIndex) => {
                    const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;
                    // colspan 계산: 최대 열 개수를 현재 행의 열 개수로 나눈 값, 나머지는 마지막 셀이 흡수
                    let colspan = Math.floor(maxColumns / row.length);
                    
                    // 마지막 셀인 경우 나머지 공간을 모두 차지
                    if (colIndex === row.length - 1) {
                      const usedColumns = Math.floor(maxColumns / row.length) * (row.length - 1);
                      colspan = maxColumns - usedColumns;
                    }
                    
                    // 🔥 핵심 기능: 셀 색상 자동 적용 (연동 칸 표시)
                    const getCellBackgroundColor = () => {
                      const cellKey = `${rowIndex}-${colIndex}`;
                      
                      // 자재명 연동 칸으로 지정된 경우
                      if (materialCells.includes(cellKey)) {
                        return '#e3f2fd'; // 연한 파란색 - 자재명 연동 칸
                      }
                      
                      // 가동상태 연동 칸으로 지정된 경우
                      if (statusCells.includes(cellKey)) {
                        return '#f3e5f5'; // 연한 보라색 - 가동상태 연동 칸
                      }
                      
                      // 기존 자동 색상 적용 (하위 호환성)
                      if (rowIndex === 1 && colIndex === 0 && cell && cell !== '자재명(연호)') {
                        return '#e8f5e8'; // 연한 초록색 - 자재명이 입력된 경우
                      }
                      if (rowIndex === 1 && colIndex === 1) {
                        if (cell === '가동중') return '#d4edda'; // 연한 초록색
                        if (cell === '비가동') return '#f8d7da'; // 연한 빨간색
                        if (cell === '정비중') return '#fff3cd'; // 연한 노란색
                        if (cell === '가동대기') return '#d1ecf1'; // 연한 파란색
                      }
                      return 'white'; // 기본 배경색
                    };

                    return (
                      <td
                        key={colIndex}
                        colSpan={colspan}
                        style={{
                          border: '1px solid #bdc3c7',
                          padding: '4px',
                          background: getCellBackgroundColor(),
                          textAlign: 'center',
                          fontSize: '9px',
                          minWidth: '40px',
                          position: 'relative',
                          cursor: 'pointer'
                        }}
                        onClick={() => handleCellEdit(rowIndex, colIndex, cell)}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            value={cellValue}
                            onChange={(e) => handleCellChange(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '2px 4px',
                              fontSize: '9px',
                              border: '2px solid #3498db',
                              borderRadius: '3px',
                              outline: 'none',
                              background: '#fff'
                            }}
                            autoFocus
                            onBlur={handleCellFinish}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCellFinish();
                              if (e.key === 'Escape') handleCellFinish();
                            }}
                          />
                        ) : (
                          <div style={{ position: 'relative' }}>
                            {cell}
                            
                            {/* 연동 버튼들 (편집모드일 때만 표시) */}
                            {isEditMode && (
                              <div style={{ position: 'absolute', top: '-15px', left: '0', right: '0', display: 'flex', gap: '2px', justifyContent: 'center' }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAsMaterialCell(rowIndex, colIndex);
                                  }}
                                  style={{
                                    background: materialCells.includes(`${rowIndex}-${colIndex}`) ? '#2196F3' : '#ccc',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '2px',
                                    width: '20px',
                                    height: '12px',
                                    fontSize: '8px',
                                    cursor: 'pointer'
                                  }}
                                  title="자재명 연동 칸"
                                >
                                  자재
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAsStatusCell(rowIndex, colIndex);
                                  }}
                                  style={{
                                    background: statusCells.includes(`${rowIndex}-${colIndex}`) ? '#9C27B0' : '#ccc',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '2px',
                                    width: '20px',
                                    height: '12px',
                                    fontSize: '8px',
                                    cursor: 'pointer'
                                  }}
                                  title="가동상태 연동 칸"
                                >
                                  상태
                                </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteCellFromRow(rowIndex, colIndex);
                                }}
                                style={{
                                  background: '#e74c3c',
                                  color: 'white',
                                  border: 'none',
                                    borderRadius: '2px',
                                    width: '12px',
                                    height: '12px',
                                    fontSize: '8px',
                                    cursor: 'pointer'
                                }}
                                title="이 셀 삭제"
                              >
                                  ×
                              </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>



      </div>
    </Draggable>
  );
}

// 10. 컴팩트 표 추가 모달 컴포넌트 (행 기준)
function CompactAddTableModal({ onClose, onCreateTable }) {
  const [formData, setFormData] = useState({
    title: '장비 번호',
    rows: 1, // 기본 1행으로 변경 (더 유연하게)
    width: 350,
    rowColumns: [3] // 기본 3개 열로 시작 (사용자가 자유롭게 조정)
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreateTable(formData);
  };

  const handleInputChange = (field, value) => {
    if (field === 'rows') {
      const newRows = Math.max(1, Math.min(10, parseInt(value) || 1));
      const newRowColumns = Array(newRows).fill().map((_, i) => formData.rowColumns[i] || 3);
      setFormData(prev => ({ 
        ...prev, 
        rows: newRows,
        rowColumns: newRowColumns
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleRowColumnChange = (rowIndex, columnCount) => {
    const newRowColumns = [...formData.rowColumns];
    newRowColumns[rowIndex] = Math.max(1, Math.min(20, parseInt(columnCount) || 1));
    setFormData(prev => ({ ...prev, rowColumns: newRowColumns }));
  };

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '20px',
        width: '90%',
        maxWidth: '400px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <h3 style={{ margin: 0, color: '#2c3e50', fontSize: '16px' }}>새 어싸인 표 추가</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#95a5a6'
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: '#555' }}>
              표 제목:
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="예: APG016 어싸인 현황"
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '600', color: '#555' }}>
                행 개수:
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.rows}
                onChange={(e) => handleInputChange('rows', e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '11px'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', fontWeight: '600', color: '#555' }}>
                가로 크기:
              </label>
              <input
                type="number"
                min="150"
                max="800"
                value={formData.width}
                onChange={(e) => handleInputChange('width', parseInt(e.target.value) || 300)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '11px'
                }}
              />
            </div>
          </div>
          
          <div style={{
            padding: '6px 8px',
            background: '#e8f5e8',
            borderRadius: '4px',
            fontSize: '10px',
            color: '#2d7d2d',
            textAlign: 'center'
          }}>
            💡 세로 높이는 내용에 맞게 자동으로 조정됩니다
          </div>

          {/* 각 행의 열 개수 설정 */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '600', color: '#555' }}>
              각 행의 열 개수 (각각 다르게 설정 가능):
            </label>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: `repeat(${Math.min(formData.rows, 5)}, 1fr)`, 
              gap: '6px'
            }}>
              {Array(formData.rows).fill().map((_, i) => (
                <div key={i} style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  padding: '4px',
                  border: '1px solid #eee',
                  borderRadius: '4px',
                  background: '#f9f9f9'
                }}>
                  <span style={{ fontSize: '10px', color: '#666', marginBottom: '2px', fontWeight: 'bold' }}>
                    행 {i + 1}
                  </span>
                  <span style={{ fontSize: '9px', color: '#888', marginBottom: '2px' }}>
                    열 개수
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.rowColumns[i] || 3}
                    onChange={(e) => handleRowColumnChange(i, e.target.value)}
                    style={{
                      width: '40px',
                      padding: '4px',
                      border: '1px solid #ddd',
                      borderRadius: '3px',
                      fontSize: '10px',
                      textAlign: 'center'
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 미리보기 */}
          <div style={{ 
            padding: '8px', 
            background: '#f8f9fa', 
            borderRadius: '4px',
            fontSize: '10px',
            color: '#666'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>📋 미리보기:</div>
            {formData.rowColumns.map((cols, i) => {
              const maxCols = Math.max(...formData.rowColumns);
              const isMaxRow = cols === maxCols;
              let previewText = `행${i + 1}: ${cols}개 열`;
              
              // 일반적인 설명으로 변경
              if (!isMaxRow && maxCols > cols) {
                previewText += ` → 각 셀이 ${Math.floor(maxCols / cols)}칸씩 차지`;
              }
              
              return (
                <div key={i} style={{ marginBottom: '2px' }}>
                  {previewText}
                </div>
              );
            })}
            <div style={{ marginTop: '4px', fontSize: '9px', color: '#999', fontStyle: 'italic' }}>
              💡 가장 많은 열을 가진 행이 기준이 되어 다른 행들이 자동으로 맞춰집니다
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                background: 'white',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              취소
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                background: 'linear-gradient(135deg, #20bf6b, #01a3a4)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600'
              }}
            >
              표 생성
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// 11. 🔥 완전히 새로운 생산이력 모달 컴포넌트 - 개별 블록 단위 표시
function DetailedProductionHistoryModal({ onClose, collectDetailedProductionHistory, currentTeam }) {
  const [selectedTeam, setSelectedTeam] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [detailedHistory, setDetailedHistory] = useState([]);

  // 상세 이력 데이터 로드
  useEffect(() => {
    const data = collectDetailedProductionHistory(selectedTeam);
    setDetailedHistory(data);
  }, [selectedTeam, collectDetailedProductionHistory]);

  // 타입별 필터링
  const filteredHistory = selectedType === 'ALL' 
    ? detailedHistory 
    : detailedHistory.filter(item => item.type === selectedType);

  // 🔥 공정별로만 그룹화 (같은 공정은 하나의 테이블로)
  const groupedByProcess = filteredHistory.reduce((groups, item) => {
    const processKey = item.processTitle === '장비관련' ? '장비관련' : item.processTitle;
    
    if (!groups[processKey]) {
      groups[processKey] = {
        processTitle: processKey,
        items: []
      };
    }
    groups[processKey].items.push(item);
    return groups;
  }, {});

  // 🔥 각 공정별 전체 통계 계산 (깔끔하게 정리)
  const calculateProcessStats = (processItems, processTitle) => {
    const productionBlocks = processItems.filter(item => item.type === '생산량');
    const maintenanceItems = processItems.filter(item => item.type === '정비이력' || item.type === '정비이력(추가)');
    const downtimeItems = processItems.filter(item => item.type === '비가동이력');
    
    // 🔥 그룹 합산시간만 계산 (중복 제거)
    const totalMaintenanceTime = maintenanceItems
      .filter(item => item.maintenanceInfo?.isFirstInGroup) // 첫 번째 이력의 그룹 합산시간만
      .reduce((total, item) => {
        return total + (item.maintenanceInfo?.groupTotalTime || 0);
      }, 0);
    
    // 비가동 총 시간 계산
    const totalDowntimeTime = downtimeItems.reduce((total, item) => {
      return total + (item.downtimeTime || 0);
    }, 0);
    
    // 블록별 생산량 합계
    const totalProduction = productionBlocks.reduce((total, item) => {
      const value = parseInt(item.productionValue) || 0;
      return total + value;
    }, 0);
    
    return {
      totalMaintenanceTime,
      totalDowntimeTime,
      totalProduction,
      blockCount: productionBlocks.length,
      maintenanceCount: maintenanceItems.length,
      downtimeCount: downtimeItems.length
    };
  };

  // 정렬된 키 목록 생성
  const sortedProcessKeys = Object.keys(groupedByProcess).sort((a, b) => {
    if (a === '장비관련') return 1;
    if (b === '장비관련') return -1;
    return a.localeCompare(b);
  });

  // 날짜 포맷팅
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ko-KR');
  };

  // 시간 포맷팅
  const formatTime = (minutes) => {
    if (!minutes || minutes === 0) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999999
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        width: '95vw',
        height: '85vh',
        maxWidth: '1400px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* 헤더 */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
          color: 'white',
          borderRadius: '12px 12px 0 0'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700' }}>
              📈 상세 생산이력 관리
          </h2>
            <p style={{ margin: '5px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
              개별 생산량 블록 단위로 보여줍니다 (엑셀 작성용)
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              width: '35px',
              height: '35px',
              borderRadius: '50%',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: 'bold'
            }}
          >
            ×
          </button>
        </div>

        {/* 필터 컨트롤 */}
        <div style={{
          padding: '15px 20px',
          borderBottom: '1px solid #eee',
          display: 'flex',
          gap: '20px',
          alignItems: 'center',
          background: '#f8f9fa'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#555' }}>조별 필터:</span>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              style={{
                padding: '6px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '13px'
              }}
            >
              <option value="ALL">전체 조</option>
              <option value="A">A조</option>
              <option value="B">B조</option>
              <option value="C">C조</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#555' }}>타입 필터:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={{
                padding: '6px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '13px'
              }}
            >
              <option value="ALL">전체</option>
              <option value="생산량">생산량 데이터</option>
              <option value="정비이력">정비이력</option>
              <option value="비가동이력">비가동이력</option>
              <option value="장비자재">장비자재</option>
            </select>
          </div>

          <div style={{ marginLeft: 'auto', fontSize: '13px', color: '#666' }}>
            총 {filteredHistory.length}건의 상세 이력 | {sortedProcessKeys.length}개 공정
          </div>
        </div>

        {/* 🔥 공정별 통합 생산이력 테이블 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '10px' }}>
          {sortedProcessKeys.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#999',
              fontSize: '16px'
            }}>
               해당 조건에 맞는 상세 이력이 없습니다.
            </div>
          ) : (
            sortedProcessKeys.map((processKey) => {
              const processGroup = groupedByProcess[processKey];
              const stats = calculateProcessStats(processGroup.items, processKey);
              
              return (
                <div key={processKey} style={{ marginBottom: '30px' }}>
                  {/* 공정 헤더 + 통계 정보 */}
                <div style={{
                    background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                  color: 'white',
                    padding: '15px 20px',
                  borderRadius: '8px 8px 0 0',
                  fontSize: '14px',
                  fontWeight: '700',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '18px' }}>
                    {processKey === '장비관련' ? '⚙️' : '🏭'}
                  </span>
                        <span style={{ fontSize: '16px' }}>{processKey}</span>
                </div>

                      {/* 🔥 통계 정보 표시 */}
                      <div style={{ display: 'flex', gap: '15px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span>📈</span>
                          <span>총 생산량: <strong>{stats.totalProduction}</strong></span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span>🔧</span>
                          <span>정비시간: <strong>{formatTime(stats.totalMaintenanceTime)}</strong></span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span>⏸️</span>
                          <span>비가동시간: <strong>{formatTime(stats.totalDowntimeTime)}</strong></span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span>📄</span>
                          <span>블록수: <strong>{stats.blockCount}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 통합 데이터 테이블 */}
                  <div style={{
                    background: 'white',
                  borderRadius: '0 0 8px 8px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                          <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#555', border: '1px solid #ddd', minWidth: '50px' }}>조</th>
                          <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#555', border: '1px solid #ddd', minWidth: '60px' }}>블록</th>
                          <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#555', border: '1px solid #ddd', minWidth: '70px' }}>분류</th>
                          <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#555', border: '1px solid #ddd', minWidth: '80px' }}>생산량</th>
                          <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#555', border: '1px solid #ddd', minWidth: '90px' }}>자재명</th>
                          <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#555', border: '1px solid #ddd', minWidth: '90px' }}>장비번호</th>
                          <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#555', border: '1px solid #ddd', minWidth: '100px' }}>정비시간</th>
                          <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#555', border: '1px solid #ddd', minWidth: '140px' }}>정비내용</th>
                          <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#555', border: '1px solid #ddd', minWidth: '100px' }}>비가동시간</th>
                          <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#555', border: '1px solid #ddd', minWidth: '120px' }}>비가동사유</th>
                    </tr>
                  </thead>
                  <tbody>
                        {(() => {
                          // 🔥 블록별로 그룹화하여 명확히 구분
                          const groupedByBlock = processGroup.items.reduce((blockGroups, item) => {
                            const blockKey = item.blockIndex !== '-' ? `블록${item.blockIndex}` : '기타';
                            if (!blockGroups[blockKey]) {
                              blockGroups[blockKey] = [];
                            }
                            blockGroups[blockKey].push(item);
                            return blockGroups;
                          }, {});
                          
                          const sortedBlockKeys = Object.keys(groupedByBlock).sort((a, b) => {
                            if (a === '기타') return 1;
                            if (b === '기타') return -1;
                            const aNum = parseInt(a.replace('블록', '')) || 0;
                            const bNum = parseInt(b.replace('블록', '')) || 0;
                            return aNum - bNum;
                          });
                          
                          return sortedBlockKeys.map((blockKey, blockGroupIndex) => {
                            const blockItems = groupedByBlock[blockKey];
                            // 블록 내에서 생산량 먼저, 그 다음 정비이력, 마지막에 비가동
                            const sortedBlockItems = blockItems.sort((a, b) => {
                              // 생산량이 가장 먼저
                              if (a.type === '생산량' && b.type !== '생산량') return -1;
                              if (a.type !== '생산량' && b.type === '생산량') return 1;
                              
                              // 정비 관련이 비가동보다 먼저
                              const aMaintenance = a.type.includes('정비');
                              const bMaintenance = b.type.includes('정비');
                              if (aMaintenance && b.type === '비가동이력') return -1;
                              if (a.type === '비가동이력' && bMaintenance) return 1;
                              
                              return 0;
                            });
                            
                            return sortedBlockItems.map((item, itemIndex) => {
                              const isFirstInBlock = itemIndex === 0;
                              const isLastInBlock = itemIndex === sortedBlockItems.length - 1;
                              
                              // 🔥 블록별 색상 배경 (루프 인덱스 기반)
                              const blockColors = ['#fff3e0', '#e8f5e8', '#f0f8ff', '#fff0f5', '#f5f5dc'];
                              const blockBgColor = blockKey !== '기타' ? blockColors[blockGroupIndex % blockColors.length] : '#f9f9f9';
                              
                              return (
                                <tr key={`${processKey}-${blockKey}-${itemIndex}`} style={{ 
                                  borderBottom: isLastInBlock ? '3px solid #e74c3c' : '1px solid #eee',
                                  background: item.type === '생산량' ? blockBgColor : 
                                             item.type === '정비이력' ? '#ffebee' : 
                                             item.type === '정비이력(추가)' ? '#fff3e0' : 
                                             item.type === '비가동이력' ? '#fff8e1' : '#fafafa',
                                  borderTop: isFirstInBlock ? '3px solid #e74c3c' : '1px solid transparent'
                                }}>
                            <td style={{ padding: '10px 8px', fontSize: '11px', fontWeight: '600', border: '1px solid #eee', textAlign: 'center' }}>
                          <span style={{
                            background: item.team === 'A' ? '#e74c3c' : item.team === 'B' ? '#3498db' : '#27ae60',
                            color: 'white',
                                padding: '3px 6px',
                            borderRadius: '3px',
                                fontSize: '10px',
                            fontWeight: 'bold'
                          }}>
                            {item.team}조
                          </span>
                        </td>
                            <td style={{ 
                              padding: '10px 8px', 
                              fontSize: '12px', 
                              border: '1px solid #eee', 
                              fontWeight: '700', 
                              color: '#2c3e50', 
                              textAlign: 'center',
                              background: isFirstInBlock ? 'linear-gradient(135deg, #e74c3c, #c0392b)' : 'transparent',
                              color: isFirstInBlock ? 'white' : '#2c3e50'
                            }}>
                              {isFirstInBlock ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                  <span style={{ fontSize: '14px' }}>📄</span>
                                  <span>{blockKey}</span>
                                </div>
                              ) : ''}
                            </td>
                            <td style={{ padding: '10px 8px', fontSize: '11px', border: '1px solid #eee', textAlign: 'center' }}>
                              {/* 🔥 추가된 이력은 완전히 빈 공간 */}
                              {item.type !== '정비이력(추가)' && (
                          <span style={{
                                  background: 
                                    item.type === '생산량' ? '#27ae60' :
                                    item.type === '정비이력' ? '#e74c3c' :
                                    item.type === '비가동이력' ? '#9b59b6' : '#8e44ad',
                            color: 'white',
                                  padding: '2px 6px',
                            borderRadius: '3px',
                                  fontSize: '10px',
                            fontWeight: 'bold'
                          }}>
                            {item.type}
                          </span>
                              )}
                        </td>
                            <td style={{ padding: '10px 8px', fontSize: '13px', border: '1px solid #eee', fontWeight: '700', color: '#2c3e50', textAlign: 'center' }}>
                              {item.productionValue || '-'}
                        </td>
                            <td style={{ padding: '10px 8px', fontSize: '12px', border: '1px solid #eee', fontWeight: '600', color: '#8e44ad', textAlign: 'center' }}>
                              {item.materialName || '-'}
                        </td>
                            <td style={{ padding: '10px 8px', fontSize: '11px', border: '1px solid #eee', fontWeight: '500', textAlign: 'center' }}>
                              {item.maintenanceInfo?.eqNo || item.equipmentName || '-'}
                            </td>
                            <td style={{ padding: '10px 8px', fontSize: '11px', border: '1px solid #eee', textAlign: 'center' }}>
                              {(item.type === '정비이력' || item.type === '정비이력(추가)') && item.maintenanceInfo?.timeRange && item.maintenanceInfo.timeRange !== '-' ? (
                                <div>
                                  {/* 🔥 첫 번째 이력에만 그룹 합산시간 표시 (더 명확하게) */}
                                  {item.maintenanceInfo?.isFirstInGroup && item.maintenanceInfo?.groupTotalTime > item.maintenanceTime && (
                                    <div style={{ 
                                      fontSize: '11px', 
                                      color: '#ffffff', 
                                      fontWeight: 'bold', 
                                      marginBottom: '6px',
                                      padding: '4px 8px',
                                      background: 'linear-gradient(135deg, #16a085, #27ae60)',
                                      borderRadius: '6px',
                                      border: '2px solid #16a085',
                                      textAlign: 'center',
                                      boxShadow: '0 2px 4px rgba(22, 160, 133, 0.3)',
                                      textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                    }}>
                                      🔧 그룹합계: {formatTime(item.maintenanceInfo.groupTotalTime)} ({item.maintenanceInfo.groupSize}개)
                                    </div>
                                  )}
                                  
                                  {/* 개별 정비시간 */}
                                  <div style={{ 
                                    color: '#e74c3c', 
                                    fontWeight: '600'
                                  }}>
                                    {/* 🔥 "ㄴ" 기호로 추가 이력 구분 */}
                                    {!item.maintenanceInfo?.isFirstInGroup && (
                                      <span style={{ color: '#16a085', fontWeight: 'bold', marginRight: '4px' }}>ㄴ </span>
                                    )}
                                    {item.maintenanceInfo.timeRange}
                                    <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                                      ({formatTime(item.maintenanceTime)})
                                    </div>
                                    {/* 🔥 (추가) 표시 */}
                                    {item.maintenanceInfo?.isAddedByPlus && (
                                      <div style={{ fontSize: '9px', color: '#f39c12', fontWeight: 'bold', marginTop: '1px' }}>
                                        (추가)
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : '-'}
                            </td>
                            <td style={{ padding: '10px 8px', fontSize: '11px', border: '1px solid #eee' }}>
                              {(item.type === '정비이력' || item.type === '정비이력(추가)') && item.maintenanceInfo?.description && item.maintenanceInfo.description !== '-' ? (
                                <div>
                                  {/* 🔥 (추가) 표시 */}
                                  {item.maintenanceInfo?.isAddedByPlus && (
                                    <span style={{ color: '#f39c12', fontWeight: 'bold', fontSize: '10px' }}>(추가) </span>
                                  )}
                                  <span>{item.maintenanceInfo.description}</span>
                                </div>
                              ) : '-'}
                            </td>
                            <td style={{ padding: '10px 8px', fontSize: '11px', border: '1px solid #eee', textAlign: 'center' }}>
                              {item.type === '비가동이력' && item.downtimeInfo?.timeRange && item.downtimeInfo.timeRange !== '-' ? (
                                <div style={{ color: '#f39c12', fontWeight: '600' }}>
                                  {item.downtimeInfo.timeRange}
                                  <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
                                    ({formatTime(item.downtimeTime)})
                                  </div>
                                </div>
                              ) : '-'}
                            </td>
                            <td style={{ padding: '10px 8px', fontSize: '11px', border: '1px solid #eee' }}>
                              {item.type === '비가동이력' && item.downtimeInfo?.reason && item.downtimeInfo.reason !== '-' ? (
                                item.downtimeInfo.reason
                              ) : '-'}
                        </td>
                      </tr>
                              );
                            });
                          }).flat(); // 블록별 그룹들을 평탄화
                        })()}
                  </tbody>
                </table>
              </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
