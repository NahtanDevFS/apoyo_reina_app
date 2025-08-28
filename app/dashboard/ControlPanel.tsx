// app/dashboard/ControlPanel.tsx
"use client";

// Tipos
type Efecto = { id: number; nombre: string; nombre_css: string };

type Props = {
    efectos: Efecto[];
    selectedCeldasCount: number;
    letra: string;
    onLetraChange: (value: string) => void;
    selectedEfectoId: string;
    onEfectoChange: (value: string) => void;
    onApplyEfecto: () => void;
    onApplyLetra: () => void;
    onLiberar: () => void;
    onApplyGlobalEfecto: (efectoCss: string) => void;
    onStartWaveEffect: () => void;
    onStopWaveEffect: () => void; // ¡NUEVO! Prop para detener la ola
    isWaveActive: boolean; // ¡NUEVO! Para saber si la ola está activa
    isLetraButtonDisabled: boolean;
    isWaveButtonDisabled: boolean;
    isPending: boolean;
};

export default function ControlPanel({
    efectos,
    selectedCeldasCount,
    letra,
    onLetraChange,
    selectedEfectoId,
    onEfectoChange,
    onApplyEfecto,
    onApplyLetra,
    onLiberar,
    onApplyGlobalEfecto,
    onStartWaveEffect,
    onStopWaveEffect, // Recibimos la nueva prop
    isWaveActive, // Recibimos el estado de la ola
    isLetraButtonDisabled,
    isWaveButtonDisabled,
    isPending
}: Props) {
  return (
    <div className="card control-panel">
      <h2>Panel de Control</h2>
      
      <div className="control-group">
        <h3>Efectos Globales</h3>
        
        {/* --- ¡BOTÓN MODIFICADO! --- */}
        {isWaveActive ? (
          <button onClick={onStopWaveEffect} disabled={isWaveButtonDisabled || isPending} style={{backgroundColor: '#dc3545'}}>
            Detener Efecto Ola
          </button>
        ) : (
          <button onClick={onStartWaveEffect} disabled={isWaveButtonDisabled || isPending}>
            Iniciar Efecto Ola
          </button>
        )}

        {efectos.map((e) => (
            <button key={e.id} onClick={() => onApplyGlobalEfecto(e.nombre_css)} disabled={isPending}>
                {e.nombre}
            </button>
        ))}
        <button onClick={() => onApplyGlobalEfecto('inicial')} disabled={isPending}>
            Resetear Global
        </button>
      </div>

      {/* ... resto del panel sin cambios ... */}
      <div className="control-group">
        <h3>Control por Celda</h3>
        <select onChange={(e) => onEfectoChange(e.target.value)} value={selectedEfectoId}>
            <option disabled value="">Selecciona un efecto</option>
            <option value="ninguno">Ninguno (Resetear)</option>
            {efectos.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <button onClick={onApplyEfecto} disabled={isPending || selectedCeldasCount === 0}>
            Aplicar a {selectedCeldasCount} celdas
        </button>
        <button onClick={onLiberar} disabled={isPending || selectedCeldasCount === 0}>
            Liberar {selectedCeldasCount} celdas
        </button>
      </div>
      <div className="control-group">
        <h3>Efecto de Letra (1 celda ocupada)</h3>
        <input type="text" placeholder="Escribe una letra" maxLength={1} value={letra} onChange={(e) => onLetraChange(e.target.value)} />
        <button onClick={onApplyLetra} disabled={isLetraButtonDisabled}> Mostrar Letra </button>
      </div>
    </div>
  );
}
