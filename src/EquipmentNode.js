import React, { useState, useEffect, useRef } from "react";
import Draggable from "react-draggable";
import { SERVER_URL } from "./constants/url";

export default function EquipmentNode({
  eq,
  onMove,
  onDelete,
  onStatusChange,
  isAdmin,
  equipments,
  showStatus,
  setShowStatus,
  onClick,
  zIndex,
  optionInputOpen,
  showMaint,
  setShowMaint,
  showMemo,
  setShowMemo,
  openPopup,
  setOpenPopup,
  showOptionBox,
  setShowOptionBox,
}) {
  const statusOptions = [
    { value: "running", label: "가동" },
    { value: "stopped", label: "비가동" },
    { value: "maint", label: "정비중" },
    { value: "idle", label: "가동대기" },
  ];
  const lampColor = {
    running: "green",
    stopped: "orange",
    idle: "yellow",
    maint: "red",
  };
  const [edit, setEdit] = useState(false);
  const [value, setValue] = useState(eq.name);
  useEffect(() => {
    setValue(eq.name);
  }, [eq.name]);
  const saveName = () => {
    setEdit(false);
    if (value !== eq.name) {
      fetch(`${SERVER_URL}/api/equipments/${eq.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: value }),
      });
    }
  };
  const [memo, setMemo] = useState(eq.memo || "");
  useEffect(() => {
    setMemo(eq.memo || "");
  }, [eq.memo]);
  const textareaRef = useRef(null);
  function autoResize(textarea) {
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.width = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
    textarea.style.width = Math.min(textarea.scrollWidth, 400) + "px";
  }
  useEffect(() => {
    if (showMemo && textareaRef.current) {
      autoResize(textareaRef.current);
    }
  }, [showMemo]);
  const saveMemo = () => {
    setShowMemo(false);
    fetch(`${SERVER_URL}/api/equipments/${eq.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memo }),
    });
  };
  const [optionInput, setOptionInput] = useState("");
  const [options, setOptions] = useState(eq.options || []);
  const [selectedOption, setSelectedOption] = useState(eq.selectedOption || "");
  useEffect(() => {
    setOptions(eq.options || []);
    setSelectedOption(eq.selectedOption || "");
  }, [eq.options, eq.selectedOption]);
  const addOption = () => {
    const value = optionInput.trim();
    if (!value || options.includes(value)) return;
    const newOptions = [...options, value];
    setOptions(newOptions);
    setOptionInput("");
    fetch(`${SERVER_URL}/api/equipments/${eq.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ options: newOptions }),
    });
    setShowOptionBox(false);
  };
  const deleteOption = (opt) => {
    const newOptions = options.filter((o) => o !== opt);
    setOptions(newOptions);
    if (selectedOption === opt) setSelectedOption("");
    fetch(`${SERVER_URL}/api/equipments/${eq.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        options: newOptions,
        selectedOption: selectedOption === opt ? "" : selectedOption,
      }),
    });
    setShowOptionBox(false);
  };
  const handleSelectOption = (e) => {
    const value = e.target.value;
    setSelectedOption(value);
    fetch(`${SERVER_URL}/api/equipments/${eq.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedOption: value }),
    });
    setShowOptionBox(false);
  };
  const saveProcessYield = (id, value) => {
    // This is a placeholder; actual logic should be in App.js
  };
  const handleBringToFront = (e) => {
    if (typeof onClick === "function") onClick(e);
  };
  return (
    <Draggable
      position={{ x: eq.x, y: eq.y }}
      onStop={(e, data) => {
        if (isAdmin) {
          onMove(eq.id, data.x, data.y);
        }
      }}
      disabled={!isAdmin}
      key={eq.id + "-" + eq.x + "-" + eq.y}
    >
      <div
        style={{
          position: "absolute",
          width: 80,
          height: 60,
          zIndex,
          background:
            "linear-gradient(145deg, rgba(255,255,255,0.1), rgba(0,0,0,0.05))",
          borderRadius: "8px",
          padding: "2px",
          boxShadow: `
            0 4px 8px rgba(0,0,0,0.1),
            0 2px 4px rgba(0,0,0,0.06)
          `,
          transition: "all 0.3s ease",
        }}
        onClick={(e) => {
          onClick(e);
          setShowOptionBox(true);
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = `
            0 6px 12px rgba(0,0,0,0.15),
            0 3px 6px rgba(0,0,0,0.1)
          `;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0px)";
          e.currentTarget.style.boxShadow = `
            0 4px 8px rgba(0,0,0,0.1),
            0 2px 4px rgba(0,0,0,0.06)
          `;
        }}
      >
        {eq.memo && eq.memo.trim() && (
          <div
            style={{
              position: "absolute",
              left: 20,
              top: 6,
              width: 0,
              height: 0,
              borderLeft: 0,
              borderRight: "10px solid transparent",
              borderTop: "10px solid #ff4444",
              zIndex: 10,
              filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))",
              transform: "perspective(50px) rotateX(15deg)",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-8px",
                left: "2px",
                width: 0,
                height: 0,
                borderLeft: 0,
                borderRight: "6px solid transparent",
                borderTop: "6px solid #ff6666",
                filter: "blur(0.5px)",
              }}
            />
          </div>
        )}
        <div
          style={{
            width: "100%",
            height: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 2,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: `radial-gradient(circle at 30% 30%, ${
                lampColor[eq.status] || "gray"
              }, ${lampColor[eq.status] || "gray"})`,
              border: "2px solid #333",
              boxShadow: `
              0 0 12px 4px ${lampColor[eq.status] || "gray"}, 
              0 0 24px 8px ${lampColor[eq.status] || "gray"},
              0 2px 4px rgba(0,0,0,0.3),
              inset 0 1px 0 rgba(255,255,255,0.4)
            `,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "15%",
                left: "20%",
                width: "25%",
                height: "25%",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.8)",
                filter: "blur(1px)",
              }}
            />
          </div>
        </div>
        <div
          onClick={(e) => {
            e.stopPropagation();
            setShowStatus(true);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setShowMemo(true);
            setShowStatus(false);
            handleBringToFront(e);
          }}
          style={{
            width: "100%",
            height: 48,
            cursor: "pointer",
            position: "relative",
          }}
        >
          {eq.iconUrl ? (
            <img
              src={eq.iconUrl}
              alt={eq.name}
              style={{
                width: "100%",
                height: 48,
                objectFit: "contain",
                borderRadius: 8,
                border: "2px solid #e0e0e0",
                boxShadow: `
                  0 8px 16px rgba(0,0,0,0.15),
                  0 4px 8px rgba(0,0,0,0.1),
                  inset 0 1px 0 rgba(255,255,255,0.8),
                  inset 0 -1px 0 rgba(0,0,0,0.1)
                `,
                background: "linear-gradient(145deg, #f8f8f8, #e8e8e8)",
                transform: "perspective(100px) rotateX(2deg)",
                transition: "all 0.3s ease",
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
              }}
              onMouseEnter={(e) => {
                e.target.style.transform =
                  "perspective(100px) rotateX(0deg) scale(1.05)";
                e.target.style.boxShadow = `
                  0 12px 24px rgba(0,0,0,0.2),
                  0 6px 12px rgba(0,0,0,0.15),
                  inset 0 1px 0 rgba(255,255,255,0.9),
                  inset 0 -1px 0 rgba(0,0,0,0.15)
                `;
              }}
              onMouseLeave={(e) => {
                e.target.style.transform =
                  "perspective(100px) rotateX(2deg) scale(1)";
                e.target.style.boxShadow = `
                  0 8px 16px rgba(0,0,0,0.15),
                  0 4px 8px rgba(0,0,0,0.1),
                  inset 0 1px 0 rgba(255,255,255,0.8),
                  inset 0 -1px 0 rgba(0,0,0,0.1)
                `;
              }}
            />
          ) : (
            <div
              style={{
                background: "linear-gradient(145deg, #777, #555)",
                color: "#fff",
                width: "100%",
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                border: "2px solid #999",
                boxShadow: `
                0 8px 16px rgba(0,0,0,0.25),
                0 4px 8px rgba(0,0,0,0.15),
                inset 0 1px 0 rgba(255,255,255,0.3),
                inset 0 -1px 0 rgba(0,0,0,0.2)
              `,
                transform: "perspective(100px) rotateX(2deg)",
                transition: "all 0.3s ease",
                textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                fontWeight: "bold",
                fontSize: "16px",
              }}
            >
              {eq.name[0]}
            </div>
          )}
          {showStatus && isAdmin && !showMemo && (
            <button
              style={{
                position: "absolute",
                top: -7,
                right: 7,
                width: 20,
                height: 20,
                background: "transparent",
                color: "red",
                border: "none",
                borderRadius: "50%",
                fontWeight: "bold",
                fontSize: 15,
                cursor: "pointer",
                zIndex: 2,
                lineHeight: "10px",
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm("정말 삭제하시겠습니까?")) {
                  onDelete(eq.id);
                }
              }}
              title="장비 삭제"
            >
              ×
            </button>
          )}
        </div>
        <div
          style={{
            width: "100%",
            textAlign: "center",
            fontWeight: "bold",
            fontSize: 13,
            marginTop: 2,
            color: "#fff",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            textShadow: "0 1px 2px #222",
          }}
        >
          {eq.name}
        </div>
        {showOptionBox ? (
          isAdmin ? (
            <div style={{ width: "100%", textAlign: "center", marginTop: 2 }}>
              <input
                type="text"
                placeholder="자재명 추가"
                value={optionInput}
                onChange={(e) => setOptionInput(e.target.value)}
                style={{ width: 60, fontSize: 12, marginRight: 4 }}
              />
              <button
                style={{ fontSize: 11, padding: "2px 6px" }}
                onClick={addOption}
              >
                추가
              </button>
              <div style={{ marginTop: 2 }}>
                {options.map((opt) => (
                  <span
                    key={opt}
                    style={{
                      display: "inline-block",
                      background: "#eee",
                      color: "#333",
                      borderRadius: 4,
                      padding: "1px 6px",
                      fontSize: 11,
                      margin: "0 2px",
                    }}
                  >
                    {opt}
                    <button
                      style={{
                        marginLeft: 2,
                        fontSize: 10,
                        color: "#d00",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteOption(opt);
                      }}
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ width: "100%", textAlign: "center", marginTop: 2 }}>
              {options.length > 0 ? (
                <select
                  value={selectedOption}
                  onChange={handleSelectOption}
                  style={{ fontSize: 12, padding: "2px 6px", borderRadius: 4 }}
                >
                  <option value="">자재 선택</option>
                  {options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <span style={{ fontSize: 12, color: "#888" }}>자재 없음</span>
              )}
            </div>
          )
        ) : (
          selectedOption && (
            <div
              style={{
                width: "100%",
                textAlign: "center",
                fontSize: 12,
                color: "#00e676",
                fontWeight: "bold",
                marginTop: 2,
              }}
            >
              {selectedOption}
            </div>
          )
        )}
        {showMemo && (
          <div
            style={{
              position: "absolute",
              left: 30,
              top: 20,
              width: "auto",
              maxWidth: 400,
              background: "#fff",
              color: "#222",
              border: "1px solid #888",
              borderRadius: 6,
              zIndex: (zIndex || 1) + 100,
              padding: 10,
              boxShadow: "0 2px 8px #888",
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              minWidth: 200,
            }}
            onClick={handleBringToFront}
            onMouseDown={handleBringToFront}
            onFocus={handleBringToFront}
          >
            <textarea
              ref={textareaRef}
              value={memo}
              wrap="off"
              onChange={(e) => {
                setMemo(e.target.value);
                autoResize(e.target);
              }}
              placeholder="장비 특이사항/메모 입력"
              style={{
                width: "100%",
                minWidth: 0,
                maxWidth: "100%",
                minHeight: 60,
                maxHeight: 300,
                marginBottom: 8,
                resize: "none",
                fontSize: 13,
                fontWeight: "bold",
                overflow: "hidden",
                boxSizing: "border-box",
                lineHeight: 1.5,
                border: "none",
                borderRadius: 4,
                padding: "2px 8px 6px 8px",
                background: "#fff",
                color: "#222",
                textAlign: "left",
              }}
            />
            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
            >
              <button
                onClick={() => setShowMemo(false)}
                style={{ fontSize: 12 }}
              >
                취소
              </button>
              <button
                onClick={saveMemo}
                style={{
                  fontSize: 12,
                  fontWeight: "bold",
                  color: "#fff",
                  background: "#d00",
                  border: "none",
                  borderRadius: 4,
                  padding: "2px 10px",
                }}
              >
                저장
              </button>
            </div>
          </div>
        )}
        {showStatus && !showMemo && (
          <select
            value={eq.status}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation();
              onStatusChange && onStatusChange(eq.id, e.target.value);
              setTimeout(() => setShowStatus(false), 100);
            }}
            style={{ width: "100%", marginTop: 2, fontSize: 12 }}
          >
            {[
              { value: "running", label: "가동" },
              { value: "stopped", label: "비가동" },
              { value: "maint", label: "정비중" },
              { value: "idle", label: "가동대기" },
            ].map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </Draggable>
  );
}
