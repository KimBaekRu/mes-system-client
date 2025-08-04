import React, { useState } from 'react';

export default function AddEquipmentForm({ onAdd }) {
  const [name, setName] = useState('');
  const [iconUrl, setIconUrl] = useState('');

  const handleSubmit = e => {
    e.preventDefault();
    if (!name) return;
    onAdd({ name, iconUrl, x: 100, y: 100 });
    setName(''); setIconUrl('');
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
      <input
        placeholder="장비 이름"
        value={name}
        onChange={e => setName(e.target.value)}
        required
      />
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