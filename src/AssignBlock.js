import React, { useState } from 'react';
import Draggable from 'react-draggable';

export default function AssignBlock({ block, onMove, onUpdate, onDelete }) {
  const [isDragging, setIsDragging] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [tempTeam, setTempTeam] = useState(block.team);

  const getStatusColor = (status) => {
    switch (status) {
      case '가동': return '#4CAF50';
      case '정지': return '#F44336';
      case '대기': return '#FF9800';
      case '미배정': return '#9E9E9E';
      default: return '#9E9E9E';
    }
  };

  return (
    <Draggable
      defaultPosition={{ x: block.x, y: block.y }}
      onStop={(e, data) => onMove(block.id, data.x, data.y)}
      onStart={() => setIsDragging(true)}
      onDrag={() => setIsDragging(false)}
    >
      <div
        style={{
          position: 'absolute',
          width: `${block.width}px`,
          height: `${block.height}px`,
          backgroundColor: getStatusColor(block.status),
          border: '2px solid #333',
          borderRadius: '8px',
          padding: '8px',
          cursor: isDragging ? 'grabbing' : 'grab',
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          zIndex: 5,
          color: 'white',
          fontSize: '12px',
          fontWeight: '600',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}
        onDoubleClick={() => setEditMode(true)}
      >
        {/* 라인명 */}
        <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
          {block.lineName}
        </div>

        {/* 팀 정보 */}
        <div style={{ fontSize: '11px' }}>
          {editMode ? (
            <select
              value={tempTeam}
              onChange={(e) => setTempTeam(e.target.value)}
              onBlur={() => {
                onUpdate(block.id, { team: tempTeam });
                setEditMode(false);
              }}
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '2px',
                fontSize: '11px'
              }}
              autoFocus
            >
              <option value="미배정">미배정</option>
              <option value="A">A팀</option>
              <option value="B">B팀</option>
              <option value="C">C팀</option>
              <option value="D">D팀</option>
            </select>
          ) : (
            `팀: ${block.team}`
          )}
        </div>

        {/* 상태 정보 */}
        <div style={{ fontSize: '11px' }}>
          상태: {block.status}
        </div>

        {/* 삭제 버튼 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm('이 블럭을 삭제하시겠습니까?')) {
              onDelete(block.id);
            }
          }}
          style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: '#ff4444',
            color: 'white',
            border: 'none',
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ×
        </button>
      </div>
    </Draggable>
  );
} 