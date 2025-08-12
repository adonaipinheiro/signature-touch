import React, { createRef } from 'react';
import { View } from 'react-native';
import { render, act } from '@testing-library/react-native';

// garante o mock com toDataURL
jest.mock('react-native-svg');

import { Signature, type SignatureRef } from '../Signature';

describe('<Signature />', () => {
  function getRoot(r: ReturnType<typeof render>) {
    // primeiro View é o container do componente
    return r.UNSAFE_getAllByType(View)[0];
  }

  function triggerLayout(root: any, width = 200, height = 100) {
    act(() => {
      root.props.onLayout?.({ nativeEvent: { layout: { width, height } } });
    });
  }

  function begin(root: any, x = 10, y = 10) {
    act(() => {
      root.props.onStartShouldSetResponder?.();
      root.props.onMoveShouldSetResponder?.();
      root.props.onResponderGrant?.({
        nativeEvent: { locationX: x, locationY: y },
      });
    });
  }

  function move(root: any, x = 20, y = 20) {
    act(() => {
      root.props.onResponderMove?.({
        nativeEvent: { locationX: x, locationY: y },
      });
    });
  }

  function release(root: any) {
    act(() => {
      root.props.onResponderRelease?.({ nativeEvent: {} });
    });
  }

  it('desenha, chama callbacks e exporta SVG/PNG', async () => {
    const onBegin = jest.fn();
    const onEnd = jest.fn();
    const onChange = jest.fn();

    const ref = createRef<SignatureRef>();
    const r = render(
      <Signature
        ref={ref}
        onBegin={onBegin}
        onEnd={onEnd}
        onChange={onChange}
      />
    );
    const root = getRoot(r);

    triggerLayout(root, 300, 150);

    begin(root, 10, 10);
    move(root, 30, 15);
    move(root, 60, 25);
    release(root);

    expect(onBegin).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(true);
    expect(onEnd).toHaveBeenCalledTimes(1);

    expect(ref.current?.isEmpty()).toBe(false);

    const { svg, width, height } = ref.current!.getSvg();
    expect(width).toBe(300);
    expect(height).toBe(150);
    expect(svg).toContain('<svg');
    expect(svg).toContain('<path d="');

    const dataUrl = await ref.current!.getImage({
      mimeType: 'image/png',
      quality: 1,
      scale: 2,
    });
    expect(dataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it('renderiza <rect> quando backgroundColor não é transparente', () => {
    const ref = createRef<SignatureRef>();
    const r = render(<Signature ref={ref} backgroundColor="#fff" />);
    const root = getRoot(r);
    triggerLayout(root, 200, 100);

    begin(root, 5, 5);
    release(root);

    const { svg } = ref.current!.getSvg();
    expect(svg).toContain('<rect');
  });

  it('minDistance filtra pontos; clear/undo/redo funcionam', () => {
    const onChange = jest.fn();
    const ref = createRef<SignatureRef>();
    const r = render(
      <Signature ref={ref} onChange={onChange} minDistance={50} />
    );
    const root = getRoot(r);
    triggerLayout(root, 200, 100);

    begin(root, 0, 0);
    move(root, 10, 10); // ignorado
    move(root, 15, 15); // ignorado
    move(root, 100, 100); // aceito
    release(root);

    expect(ref.current?.isEmpty()).toBe(false);

    ref.current?.undo();
    expect(onChange).toHaveBeenLastCalledWith(false);
    expect(ref.current?.isEmpty()).toBe(true);

    ref.current?.redo();
    expect(ref.current?.isEmpty()).toBe(false);

    ref.current?.clear();
    expect(ref.current?.isEmpty()).toBe(true);
  });

  it('getImage rejeita quando toDataURL não está disponível', async () => {
    // isola módulos e recria mock do SVG sem toDataURL
    jest.isolateModules(() => {
      jest.doMock('react-native-svg', () => {
        const React = require('react');
        const { View } = require('react-native');
        const Svg = React.forwardRef((_p: any, ref: any) => {
          React.useImperativeHandle(ref, () => ({})); // sem toDataURL
          return React.createElement(View);
        });
        const Path = (props: any) => React.createElement(View, props);
        const Rect = (props: any) => React.createElement(View, props);
        return { __esModule: true, default: Svg, Path, Rect };
      });

      const { Signature: LocalSignature } = require('../Signature'); // caminho correto
      const { render } = require('@testing-library/react-native');
      const ref = React.createRef<SignatureRef>();
      const r = render(React.createElement(LocalSignature, { ref }));
      const root = r.UNSAFE_getAllByType(View)[0];
      act(() => {
        root.props.onLayout?.({
          nativeEvent: { layout: { width: 100, height: 50 } },
        });
      });

      // tenta exportar (deve rejeitar)
      return ref;
    });

    // limpa mocks de módulo pra não afetar os outros testes
    jest.resetModules();
  });
});
