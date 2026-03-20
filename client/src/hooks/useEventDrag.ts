import { useState, useCallback, useRef, useEffect } from "react";
import type { UiEvent } from "@shared/types";

export interface DragState {
  eventId: string;
  event: UiEvent;
  mode: 'move' | 'resize';
  startY: number;
  startX: number;
  originalTop: number;
  originalHeight: number;
  currentTop: number;
  currentHeight: number;
  currentDayIndex?: number;
  originalDayIndex?: number;
  confirmed: boolean;
}

interface UseEventDragOptions {
  hourHeight: number;
  startHour: number;
  snapMinutes?: number;
  onDrop: (event: UiEvent, newStart: Date, newEnd: Date) => void;
}

const MIN_DURATION_MINUTES = 15;
const MAX_HOUR = 24;
const LONG_PRESS_MS = 250;
const DRAG_THRESHOLD_PX = 4;

function clampMinutes(minutes: number): number {
  return Math.max(0, Math.min(minutes, MAX_HOUR * 60));
}

export function useEventDrag({ hourHeight, startHour, snapMinutes = 15, onDrop }: UseEventDragOptions) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);
  const [justDroppedEventId, setJustDroppedEventId] = useState<string | null>(null);
  const justDroppedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{
    event: UiEvent;
    mode: 'move' | 'resize';
    startY: number;
    startX: number;
    originalTop: number;
    originalHeight: number;
    dayIndex?: number;
    pointerId: number;
    target: HTMLElement;
  } | null>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const justDraggedRef = useRef(false);
  const justDraggedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const snapToGrid = useCallback((minutes: number) => {
    return Math.round(minutes / snapMinutes) * snapMinutes;
  }, [snapMinutes]);

  const pixelsToMinutes = useCallback((px: number) => {
    return (px / hourHeight) * 60;
  }, [hourHeight]);

  useEffect(() => {
    if (!dragRef.current) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cleanupDrag();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dragState]);

  const cleanupDrag = useCallback((wasDrag = false, droppedEventId?: string) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    pendingRef.current = null;
    setPendingEventId(null);
    dragRef.current = null;
    setDragState(null);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.touchAction = '';
      scrollContainerRef.current.style.overflowY = '';
      scrollContainerRef.current = null;
    }
    if (wasDrag) {
      justDraggedRef.current = true;
      if (justDraggedTimer.current) clearTimeout(justDraggedTimer.current);
      justDraggedTimer.current = setTimeout(() => { justDraggedRef.current = false; }, 300);
    }
    if (droppedEventId) {
      setJustDroppedEventId(droppedEventId);
      if (justDroppedTimer.current) clearTimeout(justDroppedTimer.current);
      justDroppedTimer.current = setTimeout(() => setJustDroppedEventId(null), 500);
    }
  }, []);

  const findScrollContainer = useCallback((el: HTMLElement): HTMLElement | null => {
    let current: HTMLElement | null = el;
    while (current) {
      const style = window.getComputedStyle(current);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }, []);

  const confirmDrag = useCallback((pending: NonNullable<typeof pendingRef.current>) => {
    const container = findScrollContainer(pending.target);
    if (container) {
      scrollContainerRef.current = container;
      container.style.touchAction = 'none';
      container.style.overflowY = 'hidden';
    }

    const state: DragState = {
      eventId: pending.event.id,
      event: pending.event,
      mode: pending.mode,
      startY: pending.startY,
      startX: pending.startX,
      originalTop: pending.originalTop,
      originalHeight: pending.originalHeight,
      currentTop: pending.originalTop,
      currentHeight: pending.originalHeight,
      currentDayIndex: pending.dayIndex,
      originalDayIndex: pending.dayIndex,
      confirmed: true,
    };
    dragRef.current = state;
    setDragState(state);
  }, [findScrollContainer]);

  const startDrag = useCallback((
    e: React.PointerEvent,
    event: UiEvent,
    mode: 'move' | 'resize',
    currentTop: number,
    currentHeight: number,
    dayIndex?: number,
  ) => {
    e.stopPropagation();

    const isTouch = e.pointerType === 'touch';
    const target = e.currentTarget as HTMLElement;

    if (!isTouch) {
      e.preventDefault();
      target.setPointerCapture(e.pointerId);

      const state: DragState = {
        eventId: event.id,
        event,
        mode,
        startY: e.clientY,
        startX: e.clientX,
        originalTop: currentTop,
        originalHeight: currentHeight,
        currentTop,
        currentHeight,
        currentDayIndex: dayIndex,
        originalDayIndex: dayIndex,
        confirmed: true,
      };
      dragRef.current = state;
      setDragState(state);
    } else {
      pendingRef.current = {
        event,
        mode,
        startY: e.clientY,
        startX: e.clientX,
        originalTop: currentTop,
        originalHeight: currentHeight,
        dayIndex,
        pointerId: e.pointerId,
        target,
      };
      setPendingEventId(event.id);

      longPressTimer.current = setTimeout(() => {
        if (pendingRef.current) {
          setPendingEventId(null);
          confirmDrag(pendingRef.current);
        }
      }, LONG_PRESS_MS);
    }
  }, [confirmDrag]);

  const computeNewPosition = useCallback((deltaY: number, current: DragState) => {
    const deltaMinutes = pixelsToMinutes(deltaY);
    const snappedDelta = snapToGrid(deltaMinutes);
    const snappedPx = (snappedDelta / 60) * hourHeight;

    let newTop = current.originalTop;
    let newHeight = current.originalHeight;
    const maxTop = (MAX_HOUR - startHour) * hourHeight - (hourHeight * MIN_DURATION_MINUTES / 60);

    if (current.mode === 'move') {
      newTop = Math.max(0, Math.min(maxTop, current.originalTop + snappedPx));
      const maxBottom = (MAX_HOUR - startHour) * hourHeight;
      if (newTop + newHeight > maxBottom) {
        newHeight = maxBottom - newTop;
      }
    } else {
      const minHeight = (MIN_DURATION_MINUTES / 60) * hourHeight;
      newHeight = Math.max(minHeight, current.originalHeight + snappedPx);
      const maxHeight = (MAX_HOUR - startHour) * hourHeight - newTop;
      newHeight = Math.min(newHeight, maxHeight);
    }

    return { newTop, newHeight };
  }, [hourHeight, pixelsToMinutes, snapToGrid, startHour]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (pendingRef.current && !dragRef.current) {
      const dx = e.clientX - pendingRef.current.startX;
      const dy = e.clientY - pendingRef.current.startY;
      if (Math.abs(dx) > DRAG_THRESHOLD_PX * 3 || Math.abs(dy) > DRAG_THRESHOLD_PX * 3) {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        pendingRef.current = null;
        setPendingEventId(null);
      }
      return;
    }

    if (!dragRef.current) return;
    e.preventDefault();

    const deltaY = e.clientY - dragRef.current.startY;
    const { newTop, newHeight } = computeNewPosition(deltaY, dragRef.current);

    const updated = { ...dragRef.current, currentTop: newTop, currentHeight: newHeight };
    dragRef.current = updated;
    setDragState(updated);
  }, [computeNewPosition]);

  const onPointerMoveWeek = useCallback((e: React.PointerEvent, dayColumns: HTMLElement[]) => {
    if (pendingRef.current && !dragRef.current) {
      const dx = e.clientX - pendingRef.current.startX;
      const dy = e.clientY - pendingRef.current.startY;
      if (Math.abs(dx) > DRAG_THRESHOLD_PX * 3 || Math.abs(dy) > DRAG_THRESHOLD_PX * 3) {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        pendingRef.current = null;
        setPendingEventId(null);
      }
      return;
    }

    if (!dragRef.current) return;
    e.preventDefault();

    const deltaY = e.clientY - dragRef.current.startY;
    const { newTop, newHeight } = computeNewPosition(deltaY, dragRef.current);

    let newDayIndex = dragRef.current.originalDayIndex ?? 0;
    if (dragRef.current.mode === 'move') {
      for (let i = 0; i < dayColumns.length; i++) {
        if (!dayColumns[i]) continue;
        const rect = dayColumns[i].getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right) {
          newDayIndex = i;
          break;
        }
      }
    }
    newDayIndex = Math.max(0, Math.min(newDayIndex, dayColumns.length - 1));

    const updated = { ...dragRef.current, currentTop: newTop, currentHeight: newHeight, currentDayIndex: newDayIndex };
    dragRef.current = updated;
    setDragState(updated);
  }, [computeNewPosition]);

  const endDrag = useCallback((baseDate?: Date, days?: Date[]) => {
    if (pendingRef.current && !dragRef.current) {
      cleanupDrag();
      return;
    }

    if (!dragRef.current) return;
    const state = dragRef.current;

    const topMinutes = clampMinutes(snapToGrid((state.currentTop / hourHeight + startHour) * 60));
    const durationMinutes = Math.max(MIN_DURATION_MINUTES, snapToGrid((state.currentHeight / hourHeight) * 60));
    const endMinutes = clampMinutes(topMinutes + durationMinutes);

    if (endMinutes <= topMinutes) {
      cleanupDrag();
      return;
    }

    let targetDay: Date;
    if (days && state.currentDayIndex !== undefined && state.currentDayIndex >= 0 && state.currentDayIndex < days.length) {
      targetDay = days[state.currentDayIndex];
    } else {
      targetDay = baseDate || state.event.startTime;
    }

    const startH = Math.floor(topMinutes / 60);
    const startM = Math.round(topMinutes % 60);
    const endH = Math.floor(endMinutes / 60);
    const endM = Math.round(endMinutes % 60);

    const newStart = new Date(targetDay);
    newStart.setHours(startH, startM, 0, 0);

    const newEnd = new Date(targetDay);
    newEnd.setHours(endH, endM, 0, 0);

    const startChanged = newStart.getTime() !== state.event.startTime.getTime();
    const endChanged = newEnd.getTime() !== state.event.endTime.getTime();

    const didMove = startChanged || endChanged;
    if (didMove) {
      onDrop(state.event, newStart, newEnd);
    }

    cleanupDrag(didMove, state.event.id);
  }, [hourHeight, startHour, snapToGrid, onDrop, cleanupDrag]);

  const cancelDrag = useCallback(() => {
    cleanupDrag();
  }, [cleanupDrag]);

  return {
    dragState,
    isDragging: dragState !== null && dragState.confirmed,
    justDraggedRef,
    pendingEventId,
    justDroppedEventId,
    startDrag,
    onPointerMove,
    onPointerMoveWeek,
    endDrag,
    cancelDrag,
  };
}
