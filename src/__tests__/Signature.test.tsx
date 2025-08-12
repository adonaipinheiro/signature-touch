import React, { createRef } from 'react';
import { render, act } from '@testing-library/react-native';

// mock react-native-svg to provide toDataURL
const mockToDataURL = jest.fn((cb: (data: string) => void, _opts: any) =>
  cb('data:image/png;base64,mock')
);

jest.mock('react-native-svg', () => {
  const React = require('react');
  const Svg = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      toDataURL: (...args: any[]) => mockToDataURL(...args),
    }));
    return null;
  });
  return {
    __esModule: true,
    default: Svg,
    Svg,
    Path: () => null,
    Rect: () => null,
  };
});

jest.mock('react-native', () => {
  const React = require('react');
  return {
    View: ({ children, ...props }: any) =>
      React.createElement('View', props, children),
    StyleSheet: { create: (s: any) => s },
    PanResponder: {
      create: (handlers: any) => ({
        panHandlers: {
          onStartShouldSetResponder: handlers.onStartShouldSetPanResponder,
          onMoveShouldSetResponder: handlers.onMoveShouldSetPanResponder,
          onResponderGrant: handlers.onPanResponderGrant,
          onResponderMove: handlers.onPanResponderMove,
          onResponderRelease: handlers.onPanResponderRelease,
          onResponderTerminate: handlers.onPanResponderTerminate,
        },
      }),
    },
  };
});

import { View } from 'react-native';
import { Signature, pointsToPath, type SignatureRef } from '../Signature';

describe('pointsToPath', () => {
  it('handles empty and single point', () => {
    expect(pointsToPath([])).toBe('');
    expect(pointsToPath([{ x: 1, y: 2 }])).toBe('M 1 2 L 1.01 2.01');
  });

  it('creates path for multiple points', () => {
    const path = pointsToPath([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 4, y: 0 },
    ]);
    expect(path).toBe('M 0 0 Q 2 0 3 0 L 4 0');
  });

  it('falls back to first point when rest missing', () => {
    const path = pointsToPath([{ x: 0, y: 0 }, undefined as any]);
    expect(path).toBe('M 0 0 L 0 0');
  });
});

describe('Signature component', () => {
  it('supports drawing and utilities', async () => {
    const ref = createRef<SignatureRef>();
    const onBegin = jest.fn();
    const onEnd = jest.fn();
    const onChange = jest.fn();
    const { UNSAFE_getByType, unmount } = render(
      <Signature
        ref={ref}
        onBegin={onBegin}
        onEnd={onEnd}
        onChange={onChange}
        backgroundColor="#fff"
      />
    );
    const view = UNSAFE_getByType(View);

    // early redo does nothing
    act(() => {
      ref.current?.redo();
    });

    // early undo does nothing
    act(() => {
      ref.current?.undo();
    });

    // layout
    act(() => {
      view.props.onLayout({
        nativeEvent: { layout: { width: 100, height: 50 } },
      });
    });

    // responder checks
    expect(view.props.onStartShouldSetResponder()).toBe(true);
    expect(view.props.onMoveShouldSetResponder()).toBe(true);

    // start stroke
    act(() => {
      view.props.onResponderGrant({
        nativeEvent: { locationX: 0, locationY: 0 },
      });
    });

    // move but below minDistance
    act(() => {
      view.props.onResponderMove(
        { nativeEvent: { locationX: 1, locationY: 1 } },
        {}
      );
    });

    // move enough distance
    act(() => {
      view.props.onResponderMove(
        { nativeEvent: { locationX: 10, locationY: 10 } },
        {}
      );
    });

    // finish stroke
    await act(async () => {
      view.props.onResponderRelease({});
    });

    expect(onBegin).toHaveBeenCalled();
    expect(onEnd).toHaveBeenCalled();
    expect(onChange).toHaveBeenLastCalledWith(true);
    expect(ref.current?.isEmpty()).toBe(false);

    // undo and redo
    act(() => {
      ref.current?.undo();
    });
    expect(onChange).toHaveBeenLastCalledWith(false);
    expect(ref.current?.isEmpty()).toBe(true);

    act(() => {
      ref.current?.redo();
    });
    expect(onChange).toHaveBeenLastCalledWith(true);

    // redo again (nothing to redo)
    act(() => {
      ref.current?.redo();
    });

    // getSvg with background
    const svg = ref.current?.getSvg();
    expect(svg?.svg).toContain('<rect');

    // clear
    act(() => {
      ref.current?.clear();
    });
    expect(onChange).toHaveBeenLastCalledWith(false);
    expect(ref.current?.isEmpty()).toBe(true);

    // endStroke with no points
    act(() => {
      view.props.onResponderRelease({});
      view.props.onResponderTerminate({});
    });

    // getImage success
    const img = await ref.current!.getImage({
      mimeType: 'image/jpeg',
      quality: 0.5,
      scale: 2,
    });
    expect(img).toBe('data:image/png;base64,mock');

    // capture getImage for failure after unmount
    const getImage = ref.current!.getImage;
    unmount();
    await expect(getImage()).rejects.toThrow('toDataURL not supported');
  });

  it('handles transparent background', async () => {
    const ref = createRef<SignatureRef>();
    const { UNSAFE_getByType } = render(<Signature ref={ref} />);
    const view = UNSAFE_getByType(View);
    act(() => {
      view.props.onLayout({
        nativeEvent: { layout: { width: 10, height: 10 } },
      });
    });
    const svg = ref.current!.getSvg();
    expect(svg.svg).not.toContain('<rect');
    await ref.current!.getImage();
    const [, opts] =
      mockToDataURL.mock.calls[mockToDataURL.mock.calls.length - 1];
    expect(opts.backgroundColor).toBeUndefined();
  });
});
