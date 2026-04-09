/**
 * Componente reutilizable de lista con drag & drop para reordenar elementos.
 * Usa @dnd-kit para la funcionalidad de arrastrar y soltar.
 * Se puede usar tanto para plantillas de hitos como para hitos de proyecto.
 */
import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface SortableItemProps {
  id: string | number;
  children: React.ReactNode;
  disabled?: boolean;
}

/**
 * Wrapper para cada elemento sorteable.
 * Agrega el handle de arrastre (icono de grip) y las transformaciones CSS.
 */
export function SortableItem({ id, children, disabled }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: "relative" as const,
    zIndex: isDragging ? 50 : "auto" as any,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-stretch group">
      <button
        className={`flex items-center px-2 rounded-l-lg border-r border-border/50 transition-colors ${
          disabled
            ? "text-muted-foreground/30 cursor-not-allowed"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/50 cursor-grab active:cursor-grabbing"
        }`}
        {...attributes}
        {...listeners}
        tabIndex={disabled ? -1 : 0}
        aria-label="Arrastrar para reordenar"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

interface SortableListProps<T> {
  items: T[];
  getItemId: (item: T) => string | number;
  renderItem: (item: T, index: number) => React.ReactNode;
  renderOverlay?: (item: T) => React.ReactNode;
  onReorder: (items: T[]) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Lista genérica con drag & drop.
 * @param items - Array de elementos a mostrar
 * @param getItemId - Función para obtener el ID único de cada elemento
 * @param renderItem - Función para renderizar cada elemento
 * @param renderOverlay - Función opcional para renderizar el overlay durante el arrastre
 * @param onReorder - Callback cuando se reordena (recibe el nuevo array)
 * @param disabled - Deshabilitar drag & drop
 */
export function SortableList<T>({
  items,
  getItemId,
  renderItem,
  renderOverlay,
  onReorder,
  disabled = false,
  className = "",
}: SortableListProps<T>) {
  const [activeId, setActiveId] = useState<string | number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Requiere 8px de movimiento antes de activar el drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => getItemId(item) === active.id);
      const newIndex = items.findIndex((item) => getItemId(item) === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(items, oldIndex, newIndex);
        onReorder(newItems);
      }
    }
  };

  const activeItem = activeId
    ? items.find((item) => getItemId(item) === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map(getItemId)}
        strategy={verticalListSortingStrategy}
        disabled={disabled}
      >
        <div className={className}>
          {items.map((item, index) => (
            <SortableItem
              key={getItemId(item)}
              id={getItemId(item)}
              disabled={disabled}
            >
              {renderItem(item, index)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeItem && renderOverlay ? (
          <div className="shadow-lg rounded-lg border bg-card opacity-90">
            {renderOverlay(activeItem)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
