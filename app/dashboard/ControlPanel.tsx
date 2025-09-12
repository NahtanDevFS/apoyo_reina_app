// app/dashboard/ControlPanel.tsx
"use client";
import { useState } from "react";

type Efecto = { id: number; nombre: string; nombre_css: string };

type Props = {
  efectos: Efecto[];
  selectedCeldasCount: number;
  letra: string;
  onLetraChange: (value: string) => void;
  textoGlobal: string;
  onTextoGlobalChange: (value: string) => void;
  selectedEfectoId: string;
  onEfectoChange: (value: string) => void;
  onApplyEfecto: () => void;
  onApplyLetra: () => void;
  onLiberar: () => void;
  onLiberarMatriz: () => void;
  onApplyTextoToMatriz: () => void;
  onApplyGlobalEfecto: (efectoCss: string) => void;
  isLetraButtonDisabled: boolean;
  isPending: boolean;
  parpadeoColors: string[];
  setParpadeoColors: (colors: string[]) => void;
  parpadeoSpeed: number;
  setParpadeoSpeed: (speed: number) => void;
  onApplyParpadeo: () => void;
  onApplyRitmoInteractivo: () => void;
  flashSpeed: number;
  setFlashSpeed: (speed: number) => void;
  onApplyFlash: () => void;
  audioUrl: string;
  setAudioUrl: (url: string) => void;
  audioFiles: string[];
  onApplyAudio: () => void;
  onApplyCombinedEffect: () => void;
};

export default function ControlPanel({
  efectos,
  selectedCeldasCount,
  letra,
  onLetraChange,
  textoGlobal,
  onTextoGlobalChange,
  selectedEfectoId,
  onEfectoChange,
  onApplyEfecto,
  onApplyLetra,
  onLiberar,
  onLiberarMatriz,
  onApplyTextoToMatriz,
  onApplyGlobalEfecto,
  isLetraButtonDisabled,
  isPending,
  parpadeoColors,
  setParpadeoColors,
  parpadeoSpeed,
  setParpadeoSpeed,
  onApplyParpadeo,
  onApplyRitmoInteractivo,
  flashSpeed,
  setFlashSpeed,
  onApplyFlash,
  audioUrl,
  setAudioUrl,
  audioFiles,
  onApplyAudio,
  onApplyCombinedEffect,
}: Props) {
  const [newColor, setNewColor] = useState("#FFFFFF");

  const handleAddColor = () => {
    if (newColor && !parpadeoColors.includes(newColor)) {
      setParpadeoColors([...parpadeoColors, newColor]);
    }
  };

  const handleRemoveColor = (colorToRemove: string) => {
    setParpadeoColors(
      parpadeoColors.filter((color) => color !== colorToRemove)
    );
  };

  const efectosVisibles = efectos.filter(
    (e) =>
      e.nombre_css !== "ola-activa" &&
      e.nombre_css !== "parpadeo-personalizado" &&
      e.nombre_css !== "flash-fisico-regulable" &&
      e.nombre_css !== "reproducir-audio" &&
      e.nombre_css !== "combinado" &&
      e.nombre_css !== "ritmo-interactivo"
  );

  return (
    <div className="card control-panel">
      <h2>Panel de Control</h2>

      <div className="control-group">
        <h3>Efecto Combinado</h3>
        <button
          onClick={onApplyCombinedEffect}
          disabled={isPending || parpadeoColors.length < 2 || audioFiles.length === 0}
          className="btn-danger"
        >
          Activar Efecto Combinado
        </button>
      </div>

      <div className="control-group">
        <h3>Efectos Globales</h3>
        {efectosVisibles.map((e) => (
          <button
            key={e.id}
            onClick={() => onApplyGlobalEfecto(e.nombre_css)}
            disabled={isPending}
          >
            {e.nombre}
          </button>
        ))}
        <button
          onClick={() => onApplyGlobalEfecto("inicial")}
          disabled={isPending}
        >
          Resetear Global
        </button>
      </div>

      <div className="control-group">
        <h3>Audio en Bucle</h3>
        {audioFiles.length > 0 ? (
          <select
            value={audioUrl}
            onChange={(e) => setAudioUrl(e.target.value)}
          >
            {audioFiles.map((file) => (
              <option key={file} value={file}>
                {/* CORRECCIÓN: Se muestra el nombre del archivo con la barra. */}
                {file}
              </option>
            ))}
          </select>
        ) : (
          <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
            No se encontraron archivos .mp3 en la carpeta /public.
          </p>
        )}
        <button
          onClick={onApplyAudio}
          disabled={isPending || audioFiles.length === 0}
        >
          Reproducir Audio
        </button>
      </div>

      <div className="control-group">
        <h3>Flash Físico (Móvil)</h3>
        <label>Velocidad: {flashSpeed}s</label>
        <input
          type="range"
          min="0.01"
          max="2"
          step="0.05"
          value={flashSpeed}
          onChange={(e) => setFlashSpeed(Number(e.target.value))}
        />
        <button onClick={onApplyFlash} disabled={isPending}>
          Activar Flash Físico
        </button>
      </div>

      <div className="control-group">
        <h3>Parpadeo y Ritmo</h3>
        <div className="color-picker-container">
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
          />
          <button onClick={handleAddColor} disabled={isPending}>
            Añadir Color
          </button>
        </div>
        <div className="color-list">
          {parpadeoColors.map((color, index) => (
            <div
              key={index}
              className="color-item"
              style={{ backgroundColor: color }}
            >
              <button onClick={() => handleRemoveColor(color)}>X</button>
            </div>
          ))}
        </div>
        <label>Velocidad/Sensibilidad: {parpadeoSpeed}s</label>
        <input
          type="range"
          min="0.01"
          max="1"
          step="0.05"
          value={parpadeoSpeed}
          onChange={(e) => setParpadeoSpeed(Number(e.target.value))}
        />
        <button
          onClick={onApplyParpadeo}
          disabled={isPending || parpadeoColors.length < 2}
        >
          Aplicar Parpadeo Manual
        </button>
        <button
          onClick={onApplyRitmoInteractivo}
          disabled={isPending || parpadeoColors.length < 2}
        >
          Activar Ritmo Interactivo
        </button>
      </div>

      <div className="control-group">
        <h3>Control por Celda (Seleccionadas)</h3>
        <select
          onChange={(e) => onEfectoChange(e.target.value)}
          value={selectedEfectoId}
        >
          <option disabled value="">
            Selecciona un efecto
          </option>
          <option value="ninguno">Ninguno (Resetear)</option>
          {efectosVisibles.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
        <button
          onClick={onApplyEfecto}
          disabled={isPending || selectedCeldasCount === 0}
        >
          Aplicar a {selectedCeldasCount} celdas
        </button>
        <button
          onClick={onLiberar}
          disabled={isPending || selectedCeldasCount === 0}
        >
          Liberar {selectedCeldasCount} celdas
        </button>
      </div>

      <div className="control-group">
        <h3>Efecto de Texto (1 celda ocupada)</h3>
        <input
          type="text"
          placeholder="Escribe una palabra"
          value={letra}
          onChange={(e) => onLetraChange(e.target.value)}
        />
        <button onClick={onApplyLetra} disabled={isLetraButtonDisabled}>
          Mostrar Texto en Celda
        </button>
      </div>

      <div className="control-group">
        <h3>Acciones de Matriz Completa</h3>
        <input
          type="text"
          placeholder="Texto para todos"
          value={textoGlobal}
          onChange={(e) => onTextoGlobalChange(e.target.value)}
        />
        <button
          onClick={onApplyTextoToMatriz}
          disabled={isPending || !textoGlobal.trim()}
        >
          Enviar Texto a Todos
        </button>
        <button
          onClick={onLiberarMatriz}
          disabled={isPending}
          className="btn-danger"
        >
          Liberar Matriz Completa
        </button>
      </div>
    </div>
  );
}