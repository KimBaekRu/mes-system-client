import React, { useEffect, useState } from 'react';
import Draggable from 'react-draggable';
import io from 'socket.io-client';

const DATA_FILE = 'data/equipments.json';

const socket = io('http://localhost:3001');
// 공정명(타이틀) 노드 컴포넌트
function ProcessTitleNode({ title, x, y, id, isAdmin, onMove, onEdit, onDelete, onClick, yieldValue, setYieldValue, lineName, maintenanceHistory, onAddMaint, onDeleteMaint, showMaint, setShowMaint, zIndex, lastSaved: propLastSaved, equipments, setEquipments }) {
  const [edit, setEdit] = useState(false);
  const [value, setValue] = useState(title);
  useEffect(() => { setValue(title); }, [title]);
  // 정비이력 입력/표시 기능 추가
  const [maintStart, setMaintStart] = useState('');
  const [maintEnd, setMaintEnd] = useState('');
  const [maintDesc, setMaintDesc] = useState('');
  const [maintEqNo, setMaintEqNo] = useState(''); // 장비번호 상태 추가 복구
  const [openMaintInputIdx, setOpenMaintInputIdx] = useState(null); // 이력별 추가 입력란 인덱스
  const [plusInputs, setPlusInputs] = useState({}); // +버튼용 입력 상태
  // 생산량 저장 시간 상태
  const [lastSaved, setLastSaved] = useState(propLastSaved || null);
  useEffect(() => {
    setLastSaved(propLastSaved || null);
  }, [propLastSaved]);

  // SAVE 버튼 클릭 시 저장 및 시간 기록
  const handleSaveYield = () => {
    if (!window.confirm('저장하시겠습니까?')) return;
    const now = new Date();
    const lastSavedStr = now.toLocaleString('ko-KR', { hour12: false });
    setYieldValue(inputValue); // inputValue는 아래 input의 상태로 별도 관리 필요
    setLastSaved(lastSavedStr);
    fetch(`http://localhost:3001/api/processTitles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yield: inputValue, lastSaved: lastSavedStr })
    });
    if (typeof setOpenOptionEquipmentId === 'function') setOpenOptionEquipmentId(null); // 옵션창 닫기 추가
  };
  // 생산량 입력 상태 별도 관리
  const [inputValue, setInputValue] = useState(yieldValue || '');
  useEffect(() => { setInputValue(yieldValue || ''); }, [yieldValue]);

  const addMaint = () => {
    if (!maintStart || !maintEnd || !maintDesc) return;
    const [sh, sm] = maintStart.split(':').map(Number);
    const [eh, em] = maintEnd.split(':').map(Number);
    let min = (eh - sh) * 60 + (em - sm);
    if (isNaN(min)) min = '';
    // 자정 넘김 보정
    if (min < 0) min += 24 * 60;
    const newMaint = { time: min, description: `${maintStart}~${maintEnd} ${maintDesc}`, eqNo: maintEqNo };
    onAddMaint(id, newMaint); // 부모 컴포넌트의 함수 호출
    setMaintStart(''); setMaintEnd(''); setMaintDesc(''); setMaintEqNo(''); // 장비번호 초기화
  };

  return (
    <Draggable
      defaultPosition={{ x, y }}
      onStop={(e, data) => isAdmin && onMove(id, data.x, data.y)}
      disabled={!isAdmin}
      key={id + '-' + x + '-' + y}
    >
      <div
        style={{ position: 'absolute', zIndex: zIndex, minWidth: 60, background: '#0074D9', color: '#fff', border: '1px solid #bbb', borderRadius: 4, padding: '2px 8px', textAlign: 'center', boxShadow: '0 1px 4px #ccc', fontWeight: 'bold', fontSize: 14 }}
        onClick={onClick}
      >
        {isAdmin && edit ? (
          <input
            value={value}
            onChange={e => setValue(e.target.value)}
            onBlur={() => { setEdit(false); onEdit(id, value); }}
            autoFocus
            style={{ fontSize: 14, width: 80 }}
          />
        ) : (
          <span onDoubleClick={() => isAdmin && setEdit(true)}>{title}</span>
        )}
        {lineName && <span style={{ marginLeft: 6, color: '#888', fontSize: 12 }}>({lineName})</span>}
        {/* 저장 시간 표시 */}
        {lastSaved && (
          <span style={{ marginLeft: 8, color: '#ff0', fontSize: 11 }}>
            저장: {lastSaved}
          </span>
        )}
        {isAdmin && (
          <button style={{ marginLeft: 6, fontSize: 10 }} onClick={() => { if (window.confirm('삭제하겠습니까?')) onDelete(id); }}>X</button>
        )}
        {/* 정비이력 입력/표시 버튼 */}
        <button
          style={{ marginLeft: 6, fontSize: 10 }}
          onClick={e => {
            e.stopPropagation();
            onClick(e); // bringToFront 호출
            setShowMaint(s => !s);
          }}
        >
          생산량
        </button>
        {showMaint && (
          <div style={{ background: '#f9f9f9', border: '1px solid #ccc', padding: 6, marginTop: 2, fontSize: 11, minWidth: 260, color: '#000' }} onClick={e => e.stopPropagation()}>
            {/* 생산량 입력란을 먼저 표시 */}
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', color: '#000' }}>
              <span style={{ color: '#000' }}>생산량:</span>
              <input
                type="text"
                inputMode="numeric"
                value={inputValue}
                onChange={e => {
                  if (!isAdmin) setInputValue(e.target.value);
                }}
                style={{
                  minWidth: 80,
                  width: 'auto',
                  maxWidth: 200,
                  flexGrow: 1,
                  height: 28,
                  padding: '4px 8px',
                  fontSize: 15,
                  color: '#000',
                  boxSizing: 'border-box',
                  border: '1.5px solid #bbb',
                  borderRadius: 4,
                  outline: 'none',
                  background: '#fff',
                }}
                placeholder="생산량 입력"
                readOnly={isAdmin}
              />
              {/* 작업자 모드에서만 SAVE 버튼 */}
              {!isAdmin && (
                <button style={{ fontSize: 11, marginLeft: 6, padding: '2px 10px', background: '#0074D9', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 'bold', cursor: 'pointer' }} onClick={handleSaveYield}>
                  SAVE
                </button>
              )}
            </div>
            {/* 정비이력 입력/추가 UI (작업자 모드에서만) */}
            {isAdmin ? null : (
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6, color: '#000' }}>
                <input
                  type="text"
                  placeholder="시작(예: 08:00)"
                  value={maintStart}
                  onChange={e => setMaintStart(e.target.value)}
                  style={{ width: 70, marginRight: 6, color: '#000' }}
                />
                <span style={{ marginRight: 6, color: '#000' }}>~</span>
                <input
                  type="text"
                  placeholder="종료(예: 08:05)"
                  value={maintEnd}
                  onChange={e => setMaintEnd(e.target.value)}
                  style={{ width: 70, marginRight: 6, color: '#000' }}
                />
                <input
                  type="text"
                  placeholder="장비번호"
                  value={maintEqNo}
                  onChange={e => setMaintEqNo(e.target.value)}
                  style={{ width: 60, marginRight: 6, color: '#000' }}
                />
                <input
                  type="text"
                  placeholder="정비 내용"
                  value={maintDesc}
                  onChange={e => setMaintDesc(e.target.value)}
                  style={{ flex: 1, marginRight: 6, color: '#000' }}
                />
                <button style={{ fontSize: 10, padding: '2px 8px' }} onClick={addMaint}>
                  추가
                </button>
              </div>
            )}
            {/* 이력 리스트 */}
            <div>
              <b>이력:</b>
              <ul style={{ paddingLeft: 12, margin: 0 }}>
                {(Array.isArray(maintenanceHistory) ? maintenanceHistory : []).map((m, i) => {
                  let timeRange = '';
                  let minText = '';
                  const match = m.description.match(/(\d{2}):(\d{2})~(\d{2}):(\d{2})/);
                  if (match) {
                    timeRange = `${match[1]}:${match[2]}~${match[3]}:${match[4]}`;
                    const sh = parseInt(match[1], 10), sm = parseInt(match[2], 10);
                    const eh = parseInt(match[3], 10), em = parseInt(match[4], 10);
                    let min = (eh - sh) * 60 + (em - sm);
                    // 자정 넘김 보정
                    if (!isNaN(min) && min < 0) min += 24 * 60;
                    if (!isNaN(min) && min >= 0) minText = `${min}분`;
                  } else if (m.time !== '' && m.time !== undefined && m.time !== null) {
                    minText = `${m.time}분`;
                  }
                  const desc = m.description.replace(/\d{2}:\d{2}~\d{2}:\d{2}\s*/, '');
                  return (
                    <React.Fragment key={i}>
                      <li style={{ marginBottom: 2, display: 'flex', alignItems: 'center' }}>
                        <span style={{ flex: 1, textAlign: 'left', display: 'block' }}>
                          {m._addedByPlus ? <b style={{ color: '#0074D9', marginRight: 2 }}>ㄴ</b> : null}
                          {!m._addedByPlus && m.eqNo && <span style={{ marginRight: 4, color: '#006400', fontWeight: 'bolder', fontSize: 15 }}>[{m.eqNo}]</span>}
                          {timeRange ? timeRange : ''}
                          {minText ? (timeRange ? ' / ' : '') + minText : ''}
                          {desc ? (timeRange || minText ? ' / ' : '') + desc : ''}
                          {m._addedByPlus && (
                            <span style={{ color: '#0074D9', marginLeft: 4, fontWeight: 'bold', fontSize: 11 }}>(추가)</span>
                          )}
                        </span>
                        <button style={{ marginLeft: 6, fontSize: 10 }} onClick={() => onDeleteMaint(id, i)}>삭제</button>
                        {!isAdmin && (
                          <button style={{ marginLeft: 2, fontSize: 10 }} onClick={() => setOpenMaintInputIdx(openMaintInputIdx === i ? null : i)}>+</button>
                        )}
                      </li>
                      {/* 이력별 추가 입력란 */}
                      {!isAdmin && openMaintInputIdx === i && (
                        <li style={{ marginBottom: 2, display: 'flex', alignItems: 'center', background: '#eef', padding: 4, borderRadius: 4 }}>
                          <input
                            type="text"
                            placeholder="시작(예: 08:00)"
                            value={plusInputs[i]?.start || ''}
                            onChange={e => setPlusInputs(inputs => ({ ...inputs, [i]: { ...inputs[i], start: e.target.value } }))}
                            style={{ width: 70, marginRight: 6, color: '#000' }}
                          />
                          <span style={{ marginRight: 6, color: '#000' }}>~</span>
                          <input
                            type="text"
                            placeholder="종료(예: 08:05)"
                            value={plusInputs[i]?.end || ''}
                            onChange={e => setPlusInputs(inputs => ({ ...inputs, [i]: { ...inputs[i], end: e.target.value } }))}
                            style={{ width: 70, marginRight: 6, color: '#000' }}
                          />
                          <input
                            type="text"
                            placeholder="정비 내용"
                            value={plusInputs[i]?.desc || ''}
                            onChange={e => setPlusInputs(inputs => ({ ...inputs, [i]: { ...inputs[i], desc: e.target.value } }))}
                            style={{ flex: 1, marginRight: 6, color: '#000' }}
                          />
                          <button style={{ fontSize: 10, padding: '2px 8px' }} onClick={() => {
                            const s = plusInputs[i]?.start || '';
                            const e_ = plusInputs[i]?.end || '';
                            const d = plusInputs[i]?.desc || '';
                            // 부모 이력의 eqNo(장비번호)만 사용
                            const eqNo = maintenanceHistory[i]?.eqNo || '';
                            if (!s || !e_ || !d || !eqNo) return;
                            const [sh, sm] = s.split(':').map(Number);
                            const [eh, em] = e_.split(':').map(Number);
                            let min = (eh - sh) * 60 + (em - sm);
                            if (isNaN(min)) min = '';
                            if (min < 0) min += 24 * 60;
                            const newMaint = { time: min, description: `${s}~${e_} ${d}`, eqNo, _addedByPlus: true };
                            onAddMaint(id, newMaint);
                            setPlusInputs(inputs => ({ ...inputs, [i]: { start: '', end: '', desc: '' } }));
                            setOpenMaintInputIdx(null);
                          }}>
                            추가
                          </button>
                          <button style={{ fontSize: 10, marginLeft: 2 }} onClick={() => setOpenMaintInputIdx(null)}>닫기</button>
                        </li>
                      )}
                    </React.Fragment>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
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

function EquipmentNode({ eq, onMove, onDelete, onStatusChange, isAdmin, equipments, showStatus, setShowStatus, onClick, zIndex, optionInputOpen, showMaint, setShowMaint, showMemo, setShowMemo, openPopup, setOpenPopup, showOptionBox, setShowOptionBox, openOptionEquipmentId, setOpenOptionEquipmentId }) {
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

  // 생산량 저장 함수 (작업자 모드에서만)
  const saveProcessYield = (id, value) => {
    setProcessYields(yields => ({ ...yields, [id]: value }));
    fetch(`http://localhost:3001/api/processTitles/${id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yield: value })
      }
    );
    if (typeof setOpenOptionEquipmentId === 'function') setOpenOptionEquipmentId(null); // 옵션창 닫기 추가
  };

  // bringToFront를 모든 주요 UI에 적용하기 위한 핸들러
  const handleBringToFront = (e) => {
    if (typeof onClick === 'function') onClick(e);
  };

  // [추가] 장비 이미지 사이즈 상태
  const [imgSize, setImgSize] = React.useState({ width: eq.imgWidth || 80, height: eq.imgHeight || 48 });
  const [resizing, setResizing] = React.useState(false);
  const [showResizeHandle, setShowResizeHandle] = React.useState(false);
  const imgRef = React.useRef(null);
  React.useEffect(() => {
    setImgSize({ width: eq.imgWidth || 80, height: eq.imgHeight || 48 });
  }, [eq.imgWidth, eq.imgHeight]);
  // [추가] 리사이즈 임시 상태
  const [pendingSize, setPendingSize] = React.useState(null);
  // [추가] 리사이즈 모드 상태
  const [resizeMode, setResizeMode] = React.useState(false);

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
      <div style={{ position: 'absolute', width: 80, height: 60, zIndex }} onClick={e => { onClick(e); setShowOptionBox(true); }}>
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
        {/* [수정] 상태불빛(타워램프) 가운데 정렬 */}
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
        <div
          onClick={e => { e.stopPropagation(); setShowStatus(true); setOpenOptionEquipmentId(eq.id); }}
          onDoubleClick={e => {
            e.stopPropagation();
            setShowMemo(true);
            setShowStatus(false); // 더블클릭 시 상태창 닫힘, 메모창만 열림
            handleBringToFront(e);
          }}
          style={{ width: (pendingSize ? pendingSize.width : imgSize.width), height: (pendingSize ? pendingSize.height : imgSize.height), cursor: 'pointer', position: 'relative' }}
          onMouseLeave={() => setShowResizeHandle(false)}
          ref={imgRef}
        >
          {eq.iconUrl ? (
            <img src={eq.iconUrl} alt={eq.name} style={{ width: (pendingSize ? pendingSize.width : imgSize.width), height: (pendingSize ? pendingSize.height : imgSize.height), objectFit: 'contain', borderRadius: 4 }} />
          ) : (
            <div style={{
              background: '#666', color: '#fff', width: (pendingSize ? pendingSize.width : imgSize.width), height: (pendingSize ? pendingSize.height : imgSize.height),
              display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4
            }}>
              {eq.name[0]}
            </div>
          )}
          {/* [추가] 사이즈 조정 이모티콘 (관리자만) */}
          {isAdmin && !showMemo && openOptionEquipmentId === eq.id && (
            <button
              style={{
                position: 'absolute', bottom: 2, right: 2, background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', zIndex: 10, padding: 0, lineHeight: 1
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
              <span role="img" aria-label="resize">🔧</span>
            </button>
          )}
          {/* [추가] 리사이즈 핸들 (마우스 드래그) */}
          {isAdmin && showResizeHandle && !showMemo && (
            <div
              style={{
                position: 'absolute', bottom: 0, right: 0, width: 18, height: 18, cursor: 'nwse-resize', zIndex: 20, background: 'rgba(255,255,255,0.7)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bbb', userSelect: 'none'
              }}
              onMouseDown={e => {
                e.stopPropagation();
                setResizing(true);
              }}
            >
              <span style={{ fontSize: 16 }}>⤡</span>
            </div>
          )}
          {/* [추가] 리사이즈 드래그 로직 */}
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
                // 서버 저장
                fetch(`http://localhost:3001/api/equipments/${eq.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ imgWidth: pendingSize.width, imgHeight: pendingSize.height })
                });
              }}
            />
          )}
          {/* [추가] 리사이즈 핸들 및 SAVE/취소 버튼 */}
          {isAdmin && resizeMode && openOptionEquipmentId === eq.id && !showMemo && (
            <>
              <div
                style={{
                  position: 'absolute', bottom: 0, right: 0, width: 18, height: 18, cursor: 'nwse-resize', zIndex: 20, background: 'rgba(255,255,255,0.7)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #bbb', userSelect: 'none'
                }}
                onMouseDown={e => {
                  e.stopPropagation();
                  setResizing(true);
                }}
              >
                <span style={{ fontSize: 16 }}>⤡</span>
              </div>
              {/* SAVE/취소 버튼 */}
              <div style={{ position: 'absolute', left: '50%', top: '-50px', transform: 'translateX(-50%)', zIndex: 30, background: '#fff', border: '1px solid #bbb', borderRadius: 4, padding: '4px 8px', display: 'flex', gap: 8, boxShadow: '0 2px 8px #bbb' }}>
                <button style={{ fontSize: 12, color: '#fff', background: '#0074D9', border: 'none', borderRadius: 4, padding: '2px 10px' }} onClick={() => {
                  setImgSize(pendingSize);
                  setResizeMode(false);
                  // 서버 저장
                  fetch(`http://localhost:3001/api/equipments/${eq.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imgWidth: pendingSize.width, imgHeight: pendingSize.height })
                  });
                }}>SAVE</button>
                <button style={{ fontSize: 12, color: '#222', background: '#eee', border: 'none', borderRadius: 4, padding: '2px 10px' }} onClick={() => {
                  setResizeMode(false);
                  setPendingSize(null);
                }}>취소</button>
              </div>
            </>
          )}
          {showStatus && isAdmin && !showMemo && (
            <button
              style={{
                position: 'absolute',
                top: -7,    // 더 위로
                right: 7,   // 더 왼쪽으로
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
        {/* 장비 이름 표시 */}
        <div style={{ width: (pendingSize ? pendingSize.width : imgSize.width), textAlign: 'center', fontWeight: 'bold', fontSize: 13, marginTop: 2, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 1px 2px #222', marginLeft: 'auto', marginRight: 'auto' }}>
          {eq.name}
        </div>
        {/* 자재 옵션 UI */}
        {showOptionBox ? (
          isAdmin ? (
            <div style={{ width: (pendingSize ? pendingSize.width : imgSize.width), textAlign: 'center', marginTop: 2, marginLeft: 'auto', marginRight: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                <input
                  type="text"
                  placeholder="자재명 추가"
                  value={optionInput}
                  onChange={e => setOptionInput(e.target.value)}
                  style={{ width: 60, fontSize: 12 }}
                />
                <button style={{ fontSize: 11, padding: '2px 6px' }} onClick={addOption}>추가</button>
              </div>
              <div style={{ marginTop: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                {options.map(opt => (
                  <span key={opt} style={{ display: 'flex', alignItems: 'center', background: '#eee', color: '#333', borderRadius: 4, padding: '1px 6px', fontSize: 11, margin: '1px 0' }}>
                    {opt}
                    <button style={{ marginLeft: 2, fontSize: 10, color: '#d00', background: 'none', border: 'none', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); deleteOption(opt); }}>x</button>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ width: (pendingSize ? pendingSize.width : imgSize.width), textAlign: 'center', marginTop: 2, marginLeft: 'auto', marginRight: 'auto' }}>
              {options.length > 0 ? (
                <select
                  value={selectedOption}
                  onChange={handleSelectOption}
                  style={{ fontSize: 12, padding: '2px 6px', borderRadius: 4 }}
                >
                  <option value="">자재 선택</option>
                  {options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <span style={{ fontSize: 12, color: '#888' }}>자재 없음</span>
              )}
            </div>
          )
        ) : (
          // 옵션창이 닫혀있을 때는 선택된 자재이름만 표시
          selectedOption && (
            <div style={{ width: (pendingSize ? pendingSize.width : imgSize.width), textAlign: 'center', fontSize: 12, color: '#00e676', fontWeight: 'bold', marginTop: 2, marginLeft: 'auto', marginRight: 'auto' }}>
              {selectedOption}
            </div>
          )
        )}
        {/* 메모 입력창 (모달) */}
        {showMemo && (
          <div
            style={{
              position: 'absolute', left: 30, top: 20, width: 'auto', maxWidth: 400, background: '#fff', color: '#222', border: '1px solid #888', borderRadius: 6, zIndex: (zIndex || 1) + 100, padding: 10, boxShadow: '0 2px 8px #888', display: 'flex', flexDirection: 'column', alignItems: 'stretch', minWidth: 200
            }}
            onClick={handleBringToFront}
            onMouseDown={handleBringToFront}
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
        {/* (이 부분과 관련된 button, showMaint, 생산량 input, 생산량 관련 div 전체 삭제) */}
        {/* 상태 드롭다운(선택창)도 메모창이 열려있으면 절대 렌더링되지 않게 */}
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
  }, [isAdmin]);
  // 장비별 상태창(빨간 점) 열림 여부 관리
  const [equipmentStatusOpen, setEquipmentStatusOpen] = useState({}); // { [id]: bool }

  // 1. App 컴포넌트 상단에 상태 추가
  const [selectedProcessId, setSelectedProcessId] = useState(null);
  const [processYields, setProcessYields] = useState({}); // { [id]: yieldValue }

  // 옵션 입력창 열림 상태 (관리자 모드에서만)
  const [optionInputOpenId, setOptionInputOpenId] = useState(null);

  // 메모 입력창 열림 상태 (장비 모드에서만)
  const [openMemoId, setOpenMemoId] = useState(null);

  // 팝업 관련 상태
  const [openPopup, setOpenPopup] = useState(null); // {type: 'memo'|'maint', id} or null

  // App 컴포넌트 상단에 옵션창 열림 상태 추가
  const [openOptionEquipmentId, setOpenOptionEquipmentId] = useState(null);

  useEffect(() => {
    loadEquipments();
    // 공정명 데이터 불러오기
    fetch('http://localhost:3001/api/processTitles')
      .then(r => r.json())
      .then(data => {
        setProcessTitles(data);
        // yield 값 초기화
        const yields = {};
        data.forEach(t => {
          if (typeof t.yield !== 'undefined') {
            yields[t.id] = t.yield;
          }
        });
        setProcessYields(yields);
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
      // eqNo가 장비 이름과 일치하는 장비 찾기
      const eqName = newMaint.eqNo;
      const eq = equipments.find(e => e.name === eqName);
      if (eq) {
        // 정비이력 내용 포맷 (공백 없이 통일)
        let maintText = '';
        const match = newMaint.description.match(/(\d{2}:\d{2}~\d{2}:\d{2})\s*(.*)/);
        if (match) {
          maintText = `${newMaint._addedByPlus ? '[추가]' : '[정비이력]'} ${match[1]} ${match[2]}`.trim();
        } else {
          maintText = `${newMaint._addedByPlus ? '[추가]' : '[정비이력]'} ${newMaint.description}`.trim();
        }
        const newMemo = (eq.memo ? eq.memo + '\n' : '') + maintText;
        setEquipments(eqs => eqs.map(e => e.id === eq.id ? { ...e, memo: newMemo } : e));
        fetch(`http://localhost:3001/api/equipments/${eq.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memo: newMemo })
        });
      }
    }
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
      const eq = equipments.find(e => e.name === eqName);
      if (eq) {
        // 정비이력 내용 포맷 (공백 없이 통일)
        let maintText = '';
        const match = deletedMaint.description.match(/(\d{2}:\d{2}~\d{2}:\d{2})\s*(.*)/);
        if (match) {
          maintText = `${deletedMaint._addedByPlus ? '[추가]' : '[정비이력]'} ${match[1]} ${match[2]}`.trim();
        } else {
          maintText = `${deletedMaint._addedByPlus ? '[추가]' : '[정비이력]'} ${deletedMaint.description}`.trim();
        }
        // 메모에서 해당 줄 삭제 (공백 포함 비교)
        const memoLines = (eq.memo || '').split('\n');
        const newMemo = memoLines.filter(line => line.trim() !== maintText).join('\n');
        setEquipments(eqs => eqs.map(e => e.id === eq.id ? { ...e, memo: newMemo } : e));
        fetch(`http://localhost:3001/api/equipments/${eq.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memo: newMemo })
        });
      }
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
    fetch(`http://localhost:3001/api/processTitles/${id}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yield: value })
      }
    );
    if (typeof setOpenOptionEquipmentId === 'function') setOpenOptionEquipmentId(null); // 옵션창 닫기 추가
  };

  // 창을 맨 위로 올리는 함수
  const bringToFront = (type, id) => {
    setZIndexCounter(z => {
      const nextZ = z + 1;
      if (type === 'process') {
        setProcessTitles(titles => titles.map(t => t.id === id ? { ...t, _zIndex: nextZ } : t));
      } else if (type === 'equipment') {
        setEquipments(eqs => eqs.map(eq => eq.id === id ? { ...eq, _zIndex: nextZ } : eq));
      }
      return nextZ;
    });
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
        <button onClick={() => setIsAdmin(a => !a)} style={{ padding: '4px 12px', fontWeight: 'bold' }}>
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
        setEquipmentStatusOpen({});
        // 모든 공정명 showMaint 닫기
        setProcessTitles(titles => titles.map(t => ({ ...t, _showMaint: false })));
        if (isAdmin) setOptionInputOpenId(null); // 옵션 입력창 닫기
        // 모든 장비의 메모창 닫기 (관리자/작업자 모드 모두)
        setEquipments(eqs => eqs.map(eq => ({ ...eq, _forceCloseMemo: true })));
        setTimeout(() => {
          setEquipments(eqs => eqs.map(eq => ({ ...eq, _forceCloseMemo: false })));
        }, 0);
        setOpenPopup(null); // 팝업 전체 닫기
        setOpenOptionEquipmentId(null); // 바탕화면 클릭 시 옵션창 닫기
      }}
      >
        <img src="/images/floorplan.svg" alt="배치도" style={{ width: '100%', display: 'block', opacity: 0.85, pointerEvents: 'none' }} />
        {/* 3. 공정명(타이틀) 노드들 */}
        {processTitles.map(t => (
          <ProcessTitleNode
            key={t.id}
            {...t}
            isAdmin={isAdmin}
            onMove={moveProcessTitle}
            onEdit={editProcessTitle}
            onDelete={deleteProcessTitle}
            onClick={e => {
              bringToFront('process', t.id);
              if (e) e.stopPropagation();
            }}
            yieldValue={t.yield}
            setYieldValue={v => {
              if (!isAdmin) saveProcessYield(t.id, v);
            }}
            lineName={t.lineName}
            maintenanceHistory={t.maintenanceHistory}
            onAddMaint={addProcessMaint}
            onDeleteMaint={deleteProcessMaint}
            showMaint={openPopup?.type === 'maint' && openPopup.id === t.id}
            setShowMaint={show => setOpenPopup(show ? { type: 'maint', id: t.id } : null)}
            zIndex={t._zIndex || 1}
            openPopup={openPopup}
            setOpenPopup={setOpenPopup}
            lastSaved={t.lastSaved}
            equipments={equipments}
            setEquipments={setEquipments}
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
            showStatus={!!equipmentStatusOpen[eq.id]}
            setShowStatus={open => setEquipmentStatusOpen(s => {
              if (open) {
                const newState = {};
                equipments.forEach(e => { newState[e.id] = false; });
                newState[eq.id] = true;
                return newState;
              } else {
                return { ...s, [eq.id]: false };
              }
            })}
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
            // 메모창 제어를 openPopup으로 변경
            showMemo={openPopup?.type === 'memo' && openPopup.id === eq.id}
            setShowMemo={show => setOpenPopup(show ? { type: 'memo', id: eq.id } : null)}
            openPopup={openPopup}
            setOpenPopup={setOpenPopup}
            showOptionBox={openOptionEquipmentId === eq.id}
            setShowOptionBox={open => setOpenOptionEquipmentId(open ? eq.id : null)}
            openOptionEquipmentId={openOptionEquipmentId}
            setOpenOptionEquipmentId={setOpenOptionEquipmentId}
          />
        ))}
      </div>
      {/* 상태 텍스트는 배치도 밖에 표시 */}
      {equipments.map(eq => (
        <div key={eq.id + '-status'} style={{
          position: 'absolute', left: eq.x + 45, top: eq.y,
          background: statusColor[eq.status] || 'gray', color: '#fff',
          padding: '2px 4px', borderRadius: '4px', fontSize: '10px'
        }}>
          {(() => {
            switch (eq.status) {
              case 'running': return '가동';
              case 'stopped': return '비가동';
              case 'maint': return '정비중';
              case 'idle': return '가동대기';
              default: return eq.status;
            }
          })()}
        </div>
      ))}
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
