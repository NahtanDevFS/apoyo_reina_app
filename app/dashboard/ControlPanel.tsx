// app/dashboard/ControlPanel.tsx
"use client";

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
  // --- ¡NUEVO! Props para el flash ---
  flashSpeed: number;
  setFlashSpeed: (speed: number) => void;
  onApplyFlash: () => void;
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
  // --- ¡NUEVO! Destructuración de props del flash ---
  flashSpeed,
  setFlashSpeed,
  onApplyFlash,
}: Props) {
  // Filtramos los efectos para no mostrar los que son de apoyo o personalizados
  const efectosVisibles = efectos.filter(
    (e) =>
      !e.nombre_css.includes("ola-activa") &&
      !e.nombre_css.includes("flash-personalizado")
  );

  return (
    <div className="card control-panel">
      <h2>Panel de Control</h2>

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

      {/* --- ¡NUEVA! Sección de Flash Personalizado --- */}
      <div className="control-group">
        <h3>Flash Personalizado</h3>
        <label>Velocidad de Parpadeo: {flashSpeed}s</label>
        <input
          type="range"
          min="0.01"
          max="1"
          step="0.01"
          value={flashSpeed}
          onChange={(e) => setFlashSpeed(Number(e.target.value))}
        />
        <button onClick={onApplyFlash} disabled={isPending}>
          Aplicar Flash Personalizado
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
