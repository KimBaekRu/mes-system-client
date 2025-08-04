import React from 'react';
import Draggable from 'react-draggable';

export default function LineNameNode({ name, x, y, id, isAdmin, onMove, onDelete }) {
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