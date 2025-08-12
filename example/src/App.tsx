import { useRef } from 'react';
import { View, Button, Alert } from 'react-native';
import { Signature, type SignatureRef } from 'react-native-signature-touch';

export default function App() {
  const ref = useRef<SignatureRef>(null);

  return (
    <View style={{ flex: 1 }}>
      <Signature
        ref={ref}
        strokeColor="#111"
        strokeWidth={3}
        backgroundColor="#fff"
        onBegin={() => console.log('begin')}
        onEnd={() => console.log('end')}
        onChange={(has) => console.log('has strokes?', has)}
      />

      <Button title="Limpar" onPress={() => ref.current?.clear()} />
      <Button title="Undo" onPress={() => ref.current?.undo()} />
      <Button title="Redo" onPress={() => ref.current?.redo()} />
      <Button
        title="Salvar PNG"
        onPress={async () => {
          const dataUrl = await ref.current?.getImage({
            mimeType: 'image/png',
            quality: 1,
            scale: 2,
          });
          if (dataUrl) Alert.alert('PNG Base64', dataUrl.slice(0, 64) + '...');
        }}
      />
      <Button
        title="Salvar SVG"
        onPress={() => {
          const svg = ref.current?.getSvg();
          if (svg) Alert.alert('SVG', svg.svg.slice(0, 64) + '...');
        }}
      />
    </View>
  );
}
