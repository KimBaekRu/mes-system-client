import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import Draggable from 'react-draggable';
import io from 'socket.io-client';

const DATA_FILE = 'data/equipments.json';

const socket = io('http://localhost:3001');
// 공정명(타이틀) 노드 컴포넌트
function ProcessTitleNode({
  title, x, y, id, isAdmin, onMove, onEdit, onDelete, onClick,
  lineName, maintenanceHistory, onAddMaint, onDeleteMaint, showMaint, setShowMaint, zIndex, lastSaved: propLastSaved,
  yieldValue,
  secondValue,
  setYieldValue,
  setSecondValue
}) {
  const [edit, setEdit] = useState(false);
  const [value, setValue] = useState(title);
  useEffect(() => { setValue(title); }, [title]);
  
  const [lastSaved, setLastSaved] = useState(propLastSaved || null);
  useEffect(() => { setLastSaved(propLastSaved || null); }, [propLastSaved]);

  const [inputBlocks, setInputBlocks] = useState(() => {
    const saved = localStorage.getItem(`process_${id}_blocks`);
    if (saved) {
      const blocks = JSON.parse(saved);
      return blocks.map(b => ({
        ...b,
        maintStart: b.maintStart || '',
        maintEnd: b.maintEnd || '',
        maintDesc: b.maintDesc || '',
        maintEqNo: b.maintEqNo || ''
      }));
    }
    return [{
            id: Date.now(),
            yieldValue: yieldValue || '',
            secondValue: secondValue || '',
            maintStart: '',
            maintEnd: '',
            maintDesc: '',
      maintEqNo: ''
    }];
  });

  const [openMaintInputIdx, setOpenMaintInputIdx] = useState(null);
  const [plusInputs, setPlusInputs] = useState({});

  useEffect(() => {
    localStorage.setItem(`process_${id}_blocks`, JSON.stringify(inputBlocks));
  }, [inputBlocks, id]);
  
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
      alert('시작/종료 시간, 장비번호, 정비 내용을 모두 입력해주세요.');
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
    
    handleBlockChange(index, 'maintStart', '');
    handleBlockChange(index, 'maintEnd', '');
    handleBlockChange(index, 'maintDesc', '');
    handleBlockChange(index, 'maintEqNo', '');
  };

  const handleSaveYield = (index) => {
    if (!window.confirm('저장하시겠습니까?')) return;
    const blockToSave = inputBlocks[index];
    const now = new Date();
    const lastSavedStr = now.toLocaleString('ko-KR', { hour12: false });

    if (index === 0) {
      if (setYieldValue) setYieldValue(blockToSave.yieldValue);
      if (setSecondValue) setSecondValue(blockToSave.secondValue);
    }
    setLastSaved(lastSavedStr);

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
    <Draggable defaultPosition={{ x, y }} onStop={(e, data) => isAdmin && onMove(id, data.x, data.y)} disabled={!isAdmin} key={id + '-' + x + '-' + y}>
      <div style={{ position: 'absolute', zIndex: 10000, minWidth: 60, background: '#0074D9', color: '#fff', border: '1px solid #bbb', borderRadius: 4, padding: '2px 8px', textAlign: 'center', boxShadow: '0 1px 4px #ccc', fontWeight: 'bold', fontSize: 14 }} onClick={onClick} data-process-id={id}>
        {isAdmin && edit ? <input value={value} onChange={e => setValue(e.target.value)} onBlur={() => { setEdit(false); onEdit(id, value); }} autoFocus style={{ fontSize: 14, width: 80 }} /> : <span onDoubleClick={() => isAdmin && setEdit(true)}>{title}</span>}
        {lineName && <span style={{ marginLeft: 6, color: '#888', fontSize: 12 }}>({lineName})</span>}
        {lastSaved && <span style={{ marginLeft: 8, color: '#ff0', fontSize: 11 }}>저장: {lastSaved}</span>}
        {isAdmin && <button style={{ marginLeft: 6, fontSize: 10 }} onClick={() => { if (window.confirm('삭제하겠습니까?')) onDelete(id); }}>X</button>}
        <button style={{ marginLeft: 6, fontSize: 10 }} onClick={e => { e.stopPropagation(); setShowMaint(s => !s); }}>생산량</button>
        {/* 생산량 창을 Portal로 렌더링 */}
        {showMaint && (() => {
          const processElement = document.querySelector(`[data-process-id="${id}"]`);
          if (!processElement) return null;
          
          const rect = processElement.getBoundingClientRect();
          const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
          const scrollY = window.pageYOffset || document.documentElement.scrollTop;
          const left = rect.left + scrollX;
          const top = rect.bottom + scrollY + 5;
          
          return createPortal(
            <div 
              ref={blueBoxRef} 
              style={{ 
                position: 'absolute', 
                left: `${left}px`, 
                top: `${top}px`, 
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
            {!isAdmin && <button onClick={addBlock} style={{ position: 'absolute', top: 8, right: 8, zIndex: 1, fontSize: 13, fontWeight: 'bold', background: '#fff', color: '#222', border: '1.5px solid #bbb', borderRadius: 4, boxShadow: '0 1px 3px rgba(0,0,0,0.2)', width: 24, height: 24, padding: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>＋</button>}
            <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', overflowX: 'auto' }}>
              {inputBlocks.map((block, index) => (
                <React.Fragment key={block.id}>
                  {index > 0 && <div style={{ borderLeft: '1px solid #ccc', margin: '0 8px' }} />}
                  <div style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                      <span>생산량:</span>
                      <input type="text" inputMode="numeric" value={block.yieldValue} onChange={e => handleBlockChange(index, 'yieldValue', e.target.value)} style={{ width: 60, height: 24, fontSize: 13 }} placeholder="Output" readOnly={isAdmin} />
                      <span style={{ marginLeft: 8 }}>자재명:</span>
                      <input type="text" value={block.secondValue} onChange={e => handleBlockChange(index, 'secondValue', e.target.value)} style={{ width: 60, height: 24, fontSize: 13 }} placeholder="Material" readOnly={isAdmin} />
                      {!isAdmin && (
                        <>
                          <button style={{ fontSize: 11, padding: '2px 10px', background: '#0074D9', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: 'pointer' }} onClick={() => handleSaveYield(index)}>SAVE</button>
                          {index > 0 && (
                            <button
                              style={{ fontSize: 11, padding: '2px 8px', background: '#ff4d4f', color: 'white', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: 'pointer', marginLeft: '4px' }}
                              onClick={() => removeBlock(index)}
                            >X</button>
                          )}
                        </>
                      )}
                    </div>

                    {!isAdmin && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderTop: '1px solid #eee', paddingTop: 8 }}>
                        <input type="text" placeholder="Start" value={block.maintStart} onChange={e => handleBlockChange(index, 'maintStart', e.target.value)} style={{ width: 50 }} />
                        <span>~</span>
                        <input type="text" placeholder="End" value={block.maintEnd} onChange={e => handleBlockChange(index, 'maintEnd', e.target.value)} style={{ width: 50 }} />
                        <input type="text" placeholder="EQ No." value={block.maintEqNo} onChange={e => handleBlockChange(index, 'maintEqNo', e.target.value)} style={{ width: 60 }} />
                        <input type="text" placeholder="정비 내용" value={block.maintDesc} onChange={e => handleBlockChange(index, 'maintDesc', e.target.value)} style={{ width : 80 }} />
                        <button style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => addMaint(index)}>추가</button>
              </div>
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
                              {!isAdmin && (
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
                        {!isAdmin && openMaintInputIdx === mainM.originalIndex && (
                          <li style={{ marginBottom: 2, display: 'flex', alignItems: 'center', background: '#eef', padding: 4, borderRadius: 4 }}>
                            <input type="text" placeholder="시작(예: 08:00)" value={plusInputs[mainM.originalIndex]?.start || ''} onChange={e => setPlusInputs(inputs => ({ ...inputs, [mainM.originalIndex]: { ...inputs[mainM.originalIndex], start: e.target.value } }))} style={{ width: 70, marginRight: 6, color: '#000' }} />
                            <span style={{ marginRight: 6, color: '#000' }}>~</span>
                            <input type="text" placeholder="종료(예: 08:05)" value={plusInputs[mainM.originalIndex]?.end || ''} onChange={e => setPlusInputs(inputs => ({ ...inputs, [mainM.originalIndex]: { ...inputs[mainM.originalIndex], end: e.target.value } }))} style={{ width: 70, marginRight: 6, color: '#000' }} />
                            <input type="text" placeholder="정비 내용" value={plusInputs[mainM.originalIndex]?.desc || ''} onChange={e => setPlusInputs(inputs => ({ ...inputs, [mainM.originalIndex]: { ...inputs[mainM.originalIndex], desc: e.target.value } }))} style={{ flex: 1, marginRight: 6, color: '#000' }} />
                            <button style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => {
                              const s = plusInputs[mainM.originalIndex]?.start || '';
                              const e_ = plusInputs[mainM.originalIndex]?.end || '';
                              const d = plusInputs[mainM.originalIndex]?.desc || '';
                              const eqNo = mainM.eqNo || '';
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
            </div>
                  </div>
                </React.Fragment>
                ))}
              </div>
            </div>,
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

function AddEquipmentForm({ onAdd }) {
  const [name, setName] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  // const [title, setTitle] = useState(''); // 공정 타이틀 제거

  const handleSubmit = e => {
    e.preventDefault();
    if (!name) return;
    // 장비는 y=100, 공정명은 y=30과 분리
    onAdd({ name, iconUrl, x: 100, y: 100 }); // title 제거
    setName(''); setIconUrl(''); // setTitle(''); 제거
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
      <input
        placeholder="장비 이름"
        value={name}
        onChange={e => setName(e.target.value)}
        required
      />
      {/* <input
        placeholder="공정 타이틀"
        value={title}
        onChange={e => setTitle(e.target.value)}
        style={{ marginLeft: 4 }}
      /> */}
      <input
        placeholder="아이콘 URL"
        value={iconUrl}
        onChange={e => setIconUrl(e.target.value)}
        style={{ marginLeft: 4 }}
      />
      <button type="submit">추가</button>
    </form>
  );
}

function EquipmentNode({ eq, onMove, onDelete, onStatusChange, isAdmin, equipments, setEquipments, showStatus, setShowStatus, onClick, zIndex, optionInputOpen, showMaint, setShowMaint, showMemo, setShowMemo, openPopup, setOpenPopup, showOptionBox, setShowOptionBox, openOptionEquipmentId, setOpenOptionEquipmentId, resizeTargetId, setResizeTargetId, showPopup, setPopups }) {
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
  // 메모 관련 상태
  const [memo, setMemo] = React.useState(eq.memo || '');
  React.useEffect(() => { setMemo(eq.memo || ''); }, [eq.memo]);
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
    fetch(`http://localhost:3001/api/equipments/${eq.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memo })
    });
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
  // 옵션 선택 (작업자)
  const handleSelectOption = (e) => {
    const value = e.target.value;
    setSelectedOption(value);
    fetch(`http://localhost:3001/api/equipments/${eq.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedOption: value })
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
        if (isAdmin) {
          onMove(eq.id, data.x, data.y);
        }
      }}
      disabled={!isAdmin}
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
                if (isAdmin) setResizeTargetId(eq.id); // 이미지 클릭 시에만 리사이즈 타겟 지정
              }
            }, 200);
          }}
          onDoubleClick={e => {
            doubleClickRef.current = true;
            e.stopPropagation();
            setShowMemo(true);
            setShowStatus(false);
            handleBringToFront(e);
            if (isAdmin) setResizeTargetId(null);
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
          {isAdmin && !showMemo && resizeTargetId === eq.id && !resizeMode && (
            <button
              style={{
                position: 'absolute', bottom: 5, right: -2, background: 'none', border: 'none', fontSize: 15, color: '#222', cursor: 'pointer', zIndex: 10, padding: 0, lineHeight: 1
              }}
              title="이미지 사이즈 조정"
              onClick={e => {
                e.stopPropagation();
                if (window.confirm('사이즈를 수정하시겠습니까?')) {
                  setResizeMode(true);
                  setPendingSize({ ...imgSize });
                }
              }}
            >
              <span style={{ fontSize: 15, color: '#fff', fontWeight: 'bold' }}>⤡</span>
            </button>
          )}
          {/* 리사이즈 핸들 및 저장/취소/되돌리기 버튼 (관리자, 이미지 클릭+이모티콘 클릭 시에만) */}
          {isAdmin && resizeMode && resizeTargetId === eq.id && !showMemo && (
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
                    minWidth: 0 
                  }}>
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
          {showStatus && isAdmin && !showMemo && (
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
            if (isAdmin) setEdit(true);
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
          {isAdmin && edit ? (
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
            isAdmin ? (
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
  const [newLineName, setNewLineName] = useState('');
  const [isAdmin, setIsAdmin] = useState(() => {
    const saved = localStorage.getItem('isAdmin');
    return saved === null ? true : saved === 'true';
  }); // true: 관리자, false: 작업자
  const [zIndexCounter, setZIndexCounter] = useState(100);
  const [activeNode, setActiveNode] = useState(null); // {type: 'process'|'equipment', id}

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

  // 공정별 정비이력 추가 함수
  const addProcessMaint = (processId, newMaint) => {
    const targetProcess = processTitles.find(t => t.id === processId);
    if (!targetProcess) return;

    const newHistory = [...(targetProcess.maintenanceHistory || []), newMaint];
    const updatedProcess = { ...targetProcess, maintenanceHistory: newHistory };

    setProcessTitles(titles => titles.map(t => t.id === processId ? updatedProcess : t));

    fetch(`http://localhost:3001/api/processTitles/${processId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maintenanceHistory: newHistory })
    });

    // === 장비 메모 연동 ===
    if (newMaint.eqNo) {
      // eqNo가 장비 이름과 일치하는 모든 장비 찾기
      const eqName = newMaint.eqNo;
      const matchedEqs = equipments.filter(e => e.name === eqName);
      matchedEqs.forEach(eq => {
        // 정비이력 내용 포맷 (공백 없이 통일, 줄바꿈 포함)
        let maintText = '';
        const match = newMaint.description.match(/(\d{2}:\d{2}~\d{2}:\d{2})\s*(.*)/);
        if (match) {
          maintText = `${newMaint._addedByPlus ? '[추가]' : '[정비이력]'} ${match[1]} ${match[2]}`.trim();
        } else {
          maintText = `${newMaint._addedByPlus ? '[추가]' : '[정비이력]'} ${newMaint.description}`.trim();
        }
        // 메모장에 줄바꿈 추가
        const newMemo = (eq.memo && eq.memo.trim() ? eq.memo.trim() + '\n' : '') + maintText;
        setEquipments(eqs => eqs.map(e => e.id === eq.id ? { ...e, memo: newMemo } : e));
        fetch(`http://localhost:3001/api/equipments/${eq.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memo: newMemo })
        })
        .then(res => res.json())
        .then(updatedEq => {
          setEquipments(eqs =>
            eqs.map(e => e.id === updatedEq.id ? updatedEq : e)
          );
        });
      });
    }
    // === 장비 메모 연동 후, 서버에서 최신 equipments를 다시 받아와 동기화 ===
    // (이 부분 전체 삭제)
  };

  // 공정별 정비이력 삭제 함수
  const deleteProcessMaint = (processId, indexToDelete) => {
    if (!window.confirm('삭제하겠습니까?')) return;
    const targetProcess = processTitles.find(t => t.id === processId);
    if (!targetProcess) return;

    const deletedMaint = targetProcess.maintenanceHistory[indexToDelete];
    const newHistory = targetProcess.maintenanceHistory.filter((_, i) => i !== indexToDelete);
    const updatedProcess = { ...targetProcess, maintenanceHistory: newHistory };

    setProcessTitles(titles => titles.map(t => t.id === processId ? updatedProcess : t));

    fetch(`http://localhost:3001/api/processTitles/${processId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maintenanceHistory: newHistory })
    });

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
      // 모든 장비의 메모를 한 번에 업데이트
      setEquipments(eqs =>
        eqs.map(e =>
          e.name === eqName
            ? { ...e, memo: (e.memo || '').split('\n').filter(line => line.trim() !== maintText).join('\n') }
            : e
        )
      );
      // 서버 동기화 병렬 처리
      matchedEqs.forEach(eq => {
        const newMemo = (eq.memo || '').split('\n').filter(line => line.trim() !== maintText).join('\n');
        fetch(`http://localhost:3001/api/equipments/${eq.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memo: newMemo })
        });
      });
    }
  };

  // 그리드 간격 및 장비 이미지 크기 상수
  const GRID_SIZE = 70;
  const EQUIP_WIDTH = 80;
  const EQUIP_HEIGHT = 60;

  // 1. 장비 추가 시 x, y를 그리드 교차점에 맞춰서(중심 보정 포함) 추가
  const addEquipment = eq => {
    const count = equipments.length;
    // 기본적으로 x좌표를 일렬로 배치하되, 그리드 교차점에 중심이 오도록 보정
    const gridX = Math.round((count * GRID_SIZE + EQUIP_WIDTH / 2) / GRID_SIZE) * GRID_SIZE - EQUIP_WIDTH / 2;
    const gridY = Math.round((60 + EQUIP_HEIGHT / 2) / GRID_SIZE) * GRID_SIZE - EQUIP_HEIGHT / 2;
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
      });
    }
  };

  // 생산량 저장 함수 (작업자 모드에서만)
  const saveProcessYield = (id, value) => {
    setProcessYields(yields => ({ ...yields, [id]: value }));
    setProcessTitles(titles => titles.map(t => t.id === id ? { ...t, yield: value } : t));
    fetch(`http://localhost:3001/api/processTitles/${id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yield: value })
      }
    );
  };

  // 추가값 저장 함수 (작업자 모드에서만)
  const saveProcessSecond = (id, value) => {
    setProcessSeconds(seconds => ({ ...seconds, [id]: value }));
    setProcessTitles(titles => titles.map(t => t.id === id ? { ...t, secondField: value } : t));
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
    if (!isAdmin) saveProcessSecond(id, val);
  };

  // updateTitleField 함수 추가
  const updateTitleField = (id, field, value) => {
    if (!isAdmin) {
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
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => {
          // 모드 전환과 동시에 모든 옵션창 즉시 닫기
          setOpenOptionEquipmentId(null);
          setOpenStatusEquipmentId(null);
          setResizeTargetId(null);
          setIsAdmin(a => !a);
        }} style={{ padding: '4px 12px', fontWeight: 'bold' }}>
          {isAdmin ? '관리자 모드 (전환)' : '작업자 모드 (전환)'}
        </button>
        <span style={{ marginLeft: 10, color: isAdmin ? 'red' : 'blue', fontWeight: 'bold' }}>
          {isAdmin ? '관리자' : '작업자'}
        </span>
      </div>
      {isAdmin && <AddEquipmentForm onAdd={addEquipment} />}
      {/* 공정명(타이틀) 추가 폼 - 관리자만 */}
      {isAdmin && (
        <div style={{ display: 'flex', flexDirection: 'row', gap: 24, marginBottom: 10, alignItems: 'center' }}>
          <form onSubmit={e => { e.preventDefault(); if (newProcessTitle) { addProcessTitle(newProcessTitle); setNewProcessTitle(''); } }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              placeholder="공정명(타이틀)"
              value={newProcessTitle}
              onChange={e => setNewProcessTitle(e.target.value)}
              style={{ marginRight: 6 }}
            />
            <button type="submit">공정명 추가</button>
          </form>
          <form onSubmit={e => { e.preventDefault(); if (newLineName) { addLineName(newLineName); setNewLineName(''); } }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              placeholder="라인명(숫자)"
              value={newLineName}
              onChange={e => setNewLineName(e.target.value)}
              style={{ marginRight: 6 }}
            />
            <button type="submit">라인명 추가</button>
          </form>
        </div>
      )}
      <div style={{
        position: 'relative',
        width: 1920,
        height: 1080,
        background: isAdmin
          ? `repeating-linear-gradient(to right, #bbb, #bbb 2px, transparent 2px, transparent 70px),
              repeating-linear-gradient(to bottom, #bbb, #bbb 2px, transparent 2px, transparent 70px)`
          : undefined,
        overflow: 'auto'
      }}
      onClick={() => {
        setOpenStatusEquipmentId(null); // 바탕화면 클릭 시 상태창 닫힘
        setOpenOptionEquipmentId(null); // 자재 옵션창도 닫힘
        setResizeTargetId(null); // 바탕화면 클릭 시 이모티콘 숨김
        setOpenPopup(null); // 모든 공정 노드 팝업을 닫습니다.
      }}
      >
        <img src="/images/floorplan.svg" alt="배치도" style={{ width: '100%', height: '100%', position: 'absolute', left: 0, top: 0, zIndex: 0, opacity: 0.85, pointerEvents: 'none' }} />
        {/* 3. 공정명(타이틀) 노드들 */}
        {console.log('processTitles length:', processTitles.length, 'processTitles:', processTitles)}
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
            equipments={equipments}
            setEquipments={setEquipments}
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
            equipments={equipments}
            setEquipments={setEquipments}
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
          />
        ))}
      </div>
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
function LineNameNode({ name, x, y, id, isAdmin, onMove, onDelete }) {
  return (
    <Draggable
      position={{ x, y }}
      onStop={(e, data) => isAdmin && onMove(id, data.x, data.y)}
      disabled={!isAdmin}
      key={id + '-' + x + '-' + y}
    >
      <div style={{ position: 'absolute', zIndex: 10, minWidth: 60, background: '#000', color: '#fff', border: '1px solid #bbb', borderRadius: 4, padding: '2px 8px', textAlign: 'center', boxShadow: '0 1px 4px #ccc', fontWeight: 'bold', fontSize: 14 }}>
        <span>{name}</span>
        {isAdmin && (
          <button style={{ marginLeft: 6, fontSize: 10 }} onClick={() => { if (window.confirm('삭제하겠습니까?')) onDelete(id); }}>X</button>
        )}
      </div>
    </Draggable>
  );
}