import {
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  type GestureResponderEvent,
  type PanResponderGestureState,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

export type SignatureRef = {
  clear: () => void;
  undo: () => void;
  redo: () => void;
  isEmpty: () => boolean;
  getSvg: () => { svg: string; width: number; height: number };
  getImage: (opts?: {
    mimeType?: 'image/png' | 'image/jpeg';
    quality?: number;
    scale?: number;
  }) => Promise<string>;
};

export type SignatureProps = {
  strokeColor?: string;
  strokeWidth?: number;
  backgroundColor?: string;
  minDistance?: number;
  onBegin?: () => void;
  onEnd?: (paths: string[]) => void;
  onChange?: (hasStrokes: boolean) => void;
  style?: any;
};

type Point = { x: number; y: number };

function dist(a: Point, b: Point) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function pointsToPath(points: readonly Point[]): string {
  const [first, ...rest] = points;
  if (!first) return '';

  if (rest.length === 0) {
    return `M ${first.x} ${first.y} L ${first.x + 0.01} ${first.y + 0.01}`;
  }

  let d = `M ${first.x} ${first.y}`;

  for (let i = 0; i < rest.length - 1; i++) {
    const curr = rest[i]!;
    const next = rest[i + 1]!;
    const midX = (curr.x + next.x) / 2;
    const midY = (curr.y + next.y) / 2;
    d += ` Q ${curr.x} ${curr.y} ${midX} ${midY}`;
  }

  const last = rest[rest.length - 1] ?? first;
  d += ` L ${last.x} ${last.y}`;
  return d;
}

export const Signature = forwardRef<SignatureRef, SignatureProps>(
  function Signature(
    {
      strokeColor = '#000',
      strokeWidth = 3,
      backgroundColor = 'transparent',
      minDistance = 2,
      onBegin,
      onEnd,
      onChange,
      style,
    },
    ref
  ) {
    const svgRef = useRef<Svg>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });

    const [paths, setPaths] = useState<string[]>([]);
    const redoStack = useRef<string[]>([]);
    const currentPoints = useRef<Point[]>([]);
    const [_, setTick] = useState(0);

    const handleLayout = (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      setSize({ width, height });
    };

    const startStroke = useCallback(
      (x: number, y: number) => {
        currentPoints.current = [{ x, y }];
        redoStack.current = [];
        onBegin?.();
        setTick((t) => t + 1);
      },
      [onBegin]
    );

    const addPoint = useCallback(
      (x: number, y: number) => {
        const pts = currentPoints.current;
        const p: Point = { x, y };

        const prev = pts[pts.length - 1];
        if (!prev || dist(prev, p) >= minDistance) {
          pts.push(p);
          setTick((t) => t + 1);
        }
      },
      [minDistance]
    );

    const endStroke = useCallback(() => {
      if (currentPoints.current.length > 0) {
        const d = pointsToPath(currentPoints.current);
        setPaths((prev) => {
          const next = [...prev, d];
          onChange?.(next.length > 0);
          return next;
        });
        currentPoints.current = [];
        onEnd?.(paths);
      }
      setTick((t) => t + 1);
    }, [onEnd, onChange, paths]);

    const panResponder = useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: () => true,
          onPanResponderGrant: (evt: GestureResponderEvent) => {
            const { locationX, locationY } = evt.nativeEvent;
            startStroke(locationX, locationY);
          },
          onPanResponderMove: (
            evt: GestureResponderEvent,
            _gs: PanResponderGestureState
          ) => {
            const { locationX, locationY } = evt.nativeEvent;
            addPoint(locationX, locationY);
          },
          onPanResponderRelease: endStroke,
          onPanResponderTerminate: endStroke,
        }),
      [startStroke, addPoint, endStroke]
    );

    const clear = useCallback(() => {
      setPaths([]);
      redoStack.current = [];
      currentPoints.current = [];
      onChange?.(false);
      setTick((t) => t + 1);
    }, [onChange]);

    const undo = useCallback(() => {
      setPaths((prev) => {
        if (prev.length === 0) return prev;
        const copy = [...prev];
        const last = copy.pop()!;
        redoStack.current.push(last);
        onChange?.(copy.length > 0);
        return copy;
      });
    }, [onChange]);

    const redo = useCallback(() => {
      if (redoStack.current.length === 0) return;
      const last = redoStack.current.pop()!;
      setPaths((prev) => {
        const next = [...prev, last];
        onChange?.(next.length > 0);
        return next;
      });
    }, [onChange]);

    const isEmpty = useCallback(
      () => paths.length === 0 && currentPoints.current.length === 0,
      [paths.length]
    );

    useImperativeHandle(
      ref,
      () => ({
        clear,
        undo,
        redo,
        isEmpty,
        getSvg: () => {
          const pathEls = paths
            .map(
              (d) =>
                `<path d="${d}" stroke="${strokeColor}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`
            )
            .join('');
          const bg =
            backgroundColor !== 'transparent'
              ? `<rect width="100%" height="100%" fill="${backgroundColor}" />`
              : '';
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}">
        ${bg}${pathEls}
      </svg>`;
          return { svg, width: size.width, height: size.height };
        },
        getImage: (opts) =>
          new Promise((resolve, reject) => {
            const {
              mimeType = 'image/png',
              quality = 1,
              scale = 1,
            } = opts || {};
            const target = svgRef.current as any;
            if (!target || !target.toDataURL) {
              reject(
                new Error(
                  'toDataURL not supported. Ensure react-native-svg >= 13.'
                )
              );
              return;
            }
            const exportW = Math.max(1, Math.round(size.width * scale));
            const exportH = Math.max(1, Math.round(size.height * scale));
            target.toDataURL(
              (data: string) => {
                resolve(data);
              },
              {
                width: exportW,
                height: exportH,
                quality,
                format: mimeType === 'image/jpeg' ? 'jpg' : 'png',
                backgroundColor:
                  backgroundColor === 'transparent'
                    ? undefined
                    : backgroundColor,
              }
            );
          }),
      }),
      [
        paths,
        size,
        strokeColor,
        strokeWidth,
        backgroundColor,
        clear,
        undo,
        redo,
        isEmpty,
      ]
    );

    return (
      <View
        style={[styles.container, style]}
        onLayout={handleLayout}
        {...panResponder.panHandlers}
      >
        <Svg ref={svgRef} width={size.width} height={size.height}>
          {backgroundColor !== 'transparent' && (
            <Rect
              x={0}
              y={0}
              width={size.width}
              height={size.height}
              fill={backgroundColor}
            />
          )}
          {/* traço atual (preview) */}
          {currentPoints.current.length > 0 && (
            <Path
              d={pointsToPath(currentPoints.current)}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {/* traços consolidados */}
          {paths.map((d, i) => (
            <Path
              key={i}
              d={d}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </Svg>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: { flex: 1 },
});
