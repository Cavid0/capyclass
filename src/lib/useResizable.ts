"use client";

import { useEffect, useRef, useState } from "react";

type Direction = "horizontal" | "vertical";

export function useIsDesktop(minWidth = 768): boolean {
    const [isDesktop, setIsDesktop] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia(`(min-width: ${minWidth}px)`);
        const update = () => setIsDesktop(mq.matches);
        update();
        mq.addEventListener("change", update);
        return () => mq.removeEventListener("change", update);
    }, [minWidth]);
    return isDesktop;
}

interface Options {
    storageKey: string;
    defaultSize: number;
    min: number;
    max: number;
    direction: Direction;
}

export function useResizable({ storageKey, defaultSize, min, max, direction }: Options) {
    const [size, setSize] = useState<number>(defaultSize);
    const [dragging, setDragging] = useState(false);
    const initialisedRef = useRef(false);

    useEffect(() => {
        if (initialisedRef.current) return;
        initialisedRef.current = true;
        try {
            const stored = window.localStorage.getItem(storageKey);
            if (stored) {
                const n = Number(stored);
                if (Number.isFinite(n)) setSize(Math.min(max, Math.max(min, n)));
            }
        } catch { /* ignore */ }
    }, [storageKey, min, max]);

    useEffect(() => {
        try { window.localStorage.setItem(storageKey, String(size)); } catch { /* ignore */ }
    }, [size, storageKey]);

    const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        const isTouch = "touches" in e;
        const startPos = isTouch ? e.touches[0][direction === "horizontal" ? "clientX" : "clientY"] : (e as React.MouseEvent)[direction === "horizontal" ? "clientX" : "clientY"];
        const startSize = size;
        setDragging(true);

        const move = (clientPos: number) => {
            const delta = clientPos - startPos;
            const next = direction === "horizontal" ? startSize + delta : startSize - delta;
            setSize(Math.min(max, Math.max(min, next)));
        };

        const onMouseMove = (ev: MouseEvent) => move(direction === "horizontal" ? ev.clientX : ev.clientY);
        const onTouchMove = (ev: TouchEvent) => move(direction === "horizontal" ? ev.touches[0].clientX : ev.touches[0].clientY);
        const stop = () => {
            setDragging(false);
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", stop);
            window.removeEventListener("touchmove", onTouchMove);
            window.removeEventListener("touchend", stop);
            document.body.style.userSelect = "";
            document.body.style.cursor = "";
        };

        document.body.style.userSelect = "none";
        document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", stop);
        window.addEventListener("touchmove", onTouchMove, { passive: false });
        window.addEventListener("touchend", stop);
    };

    return { size, setSize, dragging, startDrag };
}
