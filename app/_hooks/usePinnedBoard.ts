"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DragEndEvent,
  DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { ItemType } from "@/app/_types";
import { updatePinnedOrder } from "@/app/_server/actions/dashboard";
import { usePinRefusal } from "@/app/_hooks/usePinToggle";

const MOUSE_DISTANCE = 6;
const TOUCH_DELAY = 200;
const TOUCH_TOLERANCE = 6;

interface PinnedItem {
  uuid: string;
}

class FrameKeyboardSensor extends KeyboardSensor {
  static activators = KeyboardSensor.activators.map((activator) => ({
    ...activator,
    handler: (...args: Parameters<typeof activator.handler>) => {
      const [event] = args;
      return event.target === event.currentTarget && activator.handler(...args);
    },
  }));
}

export const usePinnedBoard = <T extends PinnedItem>(items: T[], type: ItemType) => {
  const router = useRouter();
  const refuse = usePinRefusal();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeWidth, setActiveWidth] = useState<number | null>(null);
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);

  const itemsKey = items.map((item) => item.uuid).join("|");

  useEffect(() => {
    setPendingOrder(null);
  }, [itemsKey]);

  const ordered = useMemo(() => {
    if (!pendingOrder) return items;
    return pendingOrder
      .map((uuid) => items.find((item) => item.uuid === uuid))
      .filter((item): item is T => Boolean(item));
  }, [items, pendingOrder]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: MOUSE_DISTANCE } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: TOUCH_DELAY, tolerance: TOUCH_TOLERANCE },
    }),
    useSensor(FrameKeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const reset = () => {
    setActiveId(null);
    setActiveWidth(null);
  };

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    setActiveWidth(event.active.rect.current.initial?.width || null);
  };

  const onDragEnd = async (event: DragEndEvent) => {
    reset();
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = ordered.findIndex((item) => item.uuid === active.id);
    const to = ordered.findIndex((item) => item.uuid === over.id);
    if (from === -1 || to === -1) return;

    const previous = ordered.map((item) => item.uuid);
    const next = arrayMove(previous, from, to);
    setPendingOrder(next);

    try {
      const result = await updatePinnedOrder(next, type);
      if (!result.success) {
        refuse(result.error);
        setPendingOrder(previous);
        return;
      }
      router.refresh();
    } catch (error) {
      console.error("Failed to update pinned order:", error);
      refuse();
      setPendingOrder(previous);
    }
  };

  return {
    ordered,
    sensors,
    activeId,
    activeWidth,
    onDragStart,
    onDragEnd,
    onDragCancel: reset,
    activeItem: ordered.find((item) => item.uuid === activeId) || null,
  };
};
