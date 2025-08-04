// ProcessTitleNode.js
import React, { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';

export default function ProcessTitleNode({ 
  id,
  title,
  x, y,
  isAdmin,
  onMove,
  onEdit,
  onDelete,
  onClick,
  yieldValue,               // 부모로부터 내려오는 값
  secondValue: secondValueProp,
  setYieldValue,
  setSecondValue,
  lineName,
  maintenanceHistory,
  onAddMaint,
  onDeleteMaint,
  zIndex,
  lastSaved: propLastSaved,
  equipments,
  setEquipments,
  materialNames,
  onAddMaterialName,
  onRemoveMaterialName
}) {
  // ────────────────────────────────────────────────────────
  // 타이틀 수정
  const [edit, setEdit] = useState(false);
  const [value, setValue] = useState(title);
  useEffect(() => setValue(title), [title]);

  // 마지막 저장 시각
  const [lastSaved, setLastSaved] = useState(propLastSaved || null);
  useEffect(() => setLastSaved(propLastSaved || null), [propLastSaved]);

  // 팝업 로컬 제어
  const [showPopup, setShowPopup] = useState(false);

  // ────────────────────────────────────────────────────────
  // 1) 블록 상태 (LocalStorage 동기화)
  const [inputBlocks, setInputBlocks] = useState(() => {
    const saved = localStorage.getItem(`process_${id}_inputBlocks`);
    if (saved) return JSON.parse(saved);
    // 최초 로드 시 prop 값으로 초기 블록 생성
    return [{ id: Date.now(), yieldValue: yieldValue || '', secondValue: secondValueProp || '' }];
  });

  // 2) 블록 상태가 바뀔 때마다 로컬스토리지 저장
  useEffect(() => {
    localStorage.setItem(`process_${id}_inputBlocks`, JSON.stringify(inputBlocks));
  }, [inputBlocks, id]);

  // 블록 값 변경
  const handleBlockChange = (index, field, val) => {
    setInputBlocks(bs =>
      bs.map((b, i) => (i === index ? { ...b, [field]: val } : b))
    );
  };

  // 블록 추가
  const handleAddBlock = () => {
    setInputBlocks(bs => [
      ...bs,
      { id: Date.now(), yieldValue: '', secondValue: '' }
    ]);
  };

  // 블록 삭제
  const handleRemoveBlock = idx => {
    setInputBlocks(bs => bs.filter((_, i) => i !== idx));
  };

  // 블록별 SAVE (부모 상태·서버 동기화)
  const handleSaveBlock = idx => {
    if (!window.confirm('저장하시겠습니까?')) return;
    const blk = inputBlocks[idx];
    setYieldValue(blk.yieldValue);
    setSecondValue(blk.secondValue);
    const now = new Date().toLocaleString('ko-KR', { hour12: false });
    setLastSaved(now);
    fetch(`http://localhost:3001/api/processTitles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({
        yield: blk.yieldValue,
        secondField: blk.secondValue,
        lastSaved: now
      })
    });
  };

  // 팝업 외부 클릭 시 닫기
  const popupRef = useRef(null);
  useEffect(() => {
    if (!showPopup) return;
    const handler = e => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setShowPopup(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPopup]);

  // ────────────────────────────────────────────────────────
  // 정비 이력 입력 상태
  const [maintStart, setMaintStart] = useState('');
  const [maintEnd, setMaintEnd] = useState('');
  const [maintDesc, setMaintDesc] = useState('');
  const [maintEqNo, setMaintEqNo] = useState('');
  const [openMaintInputIdx, setOpenMaintInputIdx] = useState(null);
  const [plusInputs, setPlusInputs] = useState({});

  const addMaint = () => {
    if (!maintStart || !maintEnd || !maintDesc) return;
    const [sh, sm] = maintStart.split(':').map(Number);
    const [eh, em] = maintEnd.split(':').map(Number);
    let min = (eh - sh) * 60 + (em - sm);
    if (isNaN(min)) min = '';
    if (min < 0) min += 24 * 60;
    onAddMaint(id, {
      time: min,
      description: `${maintStart}~${maintEnd} ${maintDesc}`,
      eqNo: maintEqNo
    });
    setMaintStart(''); setMaintEnd(''); setMaintDesc(''); setMaintEqNo('');
  };

  // 자재명 추가 상태
  const [materialName, setMaterialName] = useState('');

  // ────────────────────────────────────────────────────────
  return (
    <Draggable
      defaultPosition={{ x,y }}
      disabled={!isAdmin}
      onStop={(e,data)=> isAdmin && onMove(id,data.x,data.y)}
      key={`${id}-${x}-${y}`}
    >
      <div
        onClick={onClick}
        style={{
          position:'absolute', zIndex,
          minWidth:60, background:'#0074D9', color:'#fff',
          border:'1px solid #bbb', borderRadius:4,
          padding:'2px 8px', textAlign:'center',
          boxShadow:'0 1px 4px #ccc',
          fontWeight:'bold', fontSize:14
        }}
      >
        {/* 타이틀 */}
        {isAdmin && edit ? (
          <input
            value={value}
            autoFocus
            style={{ fontSize:14, width:80 }}
            onChange={e=>setValue(e.target.value)}
            onBlur={()=>{ setEdit(false); onEdit(id,value); }}
          />
        ) : (
          <span onDoubleClick={()=>isAdmin&&setEdit(true)}>
            {title}
          </span>
        )}

        {/* 라인명 */}
        {lineName && (
          <span style={{ marginLeft:6, color:'#888', fontSize:12 }}>
            ({lineName})
          </span>
        )}

        {/* 마지막 저장 */}
        {lastSaved && (
          <span style={{ marginLeft:8, color:'#ff0', fontSize:11 }}>
            저장: {lastSaved}
          </span>
        )}

        {/* 삭제 버튼 */}
        {isAdmin && (
          <button
            style={{ marginLeft:6,fontSize:10 }}
            onClick={()=>{ if(window.confirm('삭제?')) onDelete(id); }}
          >X</button>
        )}

        {/* 팝업 토글 */}
        <button
          style={{ marginLeft:6,fontSize:10 }}
          onClick={e=>{ e.stopPropagation(); setShowPopup(v=>!v); }}
        >생산량</button>

        {/* 팝업 내용 */}
        {showPopup && (
          <div
            ref={popupRef}
            onClick={e=>e.stopPropagation()}
            style={{
              position:'relative', marginTop:4, padding:6,
              background:'#f9f9f9', border:'1px solid #ccc',
              minWidth:260, fontSize:11, color:'#000'
            }}
          >
            {/* 생산량/자재명 블록 */}
            {inputBlocks.map((blk, idx)=>(
              <div
                key={blk.id}
                style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, justifyContent:'center' }}
              >
                <span>생산량:</span>
              <input
                  type="text" inputMode="numeric"
                placeholder="생산량"
                  value={blk.yieldValue}
                readOnly={isAdmin}
                  onChange={e=>handleBlockChange(idx,'yieldValue',e.target.value)}
                style={{
                    width:80, height:28, padding:'4px 8px',
                    fontSize:15, border:'1.5px solid red',
                    borderRadius:4, outline:'none', background:'#fff', color:'#000'
                  }}
                />

                <span>자재명:</span>
                <input
                  type="text" placeholder="자재명"
                  value={blk.secondValue}
                  readOnly={isAdmin}
                  onChange={e=>handleBlockChange(idx,'secondValue',e.target.value)}
                  style={{
                    width:80, height:28, padding:'4px 8px',
                    fontSize:15, border:'1.5px solid #bbb',
                    borderRadius:4, outline:'none', background:'#fff', color:'#000'
                  }}
                />

                {!isAdmin && (
                  <>
                    <button
                      style={{ marginLeft:6,padding:'2px 10px',fontSize:11,background:'#0074D9',color:'#fff',border:'none',borderRadius:4,cursor:'pointer' }}
                      onClick={()=>handleSaveBlock(idx)}
                    >SAVE</button>
                    <button
                      style={{ marginLeft:4,padding:'2px 8px',fontSize:11,background:'#ddd',color:'#333',border:'none',borderRadius:4,cursor:'pointer' }}
                      onClick={()=>handleRemoveBlock(idx)}
                    >삭제</button>
                  </>
                )}
              </div>
            ))}

            {/* 블록 추가 */}
            {!isAdmin && (
              <button
                style={{ marginBottom:8,padding:'2px 10px',fontSize:11,background:'#0074D9',color:'#fff',border:'none',borderRadius:4,cursor:'pointer' }}
                onClick={handleAddBlock}
              >＋ 추가</button>
            )}

            {/* 자재명 태그 */}
            <div style={{ display:'flex', gap:6, marginBottom:8 }}>
              <input
                type="text" placeholder="자재명"
                value={materialName}
                readOnly={isAdmin}
                onChange={e=>setMaterialName(e.target.value)}
                style={{ flex:1,padding:'4px 8px',fontSize:13 }}
              />
              <button
                disabled={isAdmin}
                style={{ padding:'2px 10px',fontSize:11,background:'#0074D9',color:'#fff',border:'none',borderRadius:4,cursor:'pointer' }}
                onClick={()=>{
                  if(materialName.trim()){
                    onAddMaterialName(materialName.trim());
                    setMaterialName('');
                  }
                }}
              >추가</button>
            </div>
            {materialNames.length>0 && (
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
                <strong>자재명:</strong>
                {materialNames.map((nm,i)=>(
                  <span key={i} style={{ background:'#e3f2fd',color:'#0074D9',borderRadius:4,padding:'1px 6px',display:'flex',alignItems:'center' }}>
                    {nm}
                    <button
                      disabled={isAdmin}
                      style={{ marginLeft:4,background:'none',border:'none',color:'#d00',cursor:'pointer' }}
                      onClick={()=>onRemoveMaterialName(i)}
                    >×</button>
                  </span>
                ))}
              </div>
            )}

            {/* 정비 이력 (생략 가능한 부분) */}
            <div style={{ textAlign:'left' }}>
              <strong>이력:</strong>
              <ul style={{ paddingLeft:16,marginTop:4 }}>
                {maintenanceHistory.map((m,i)=>(
                  <li key={i} style={{ display:'flex',alignItems:'center',marginBottom:4 }}>
                    <span style={{ flex:1 }}>{m.description}</span>
                    <button style={{ fontSize:10,marginLeft:6 }} onClick={()=>onDeleteMaint(id,i)}>삭제</button>
                      </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </Draggable>
  );
} 
