import * as ImagePicker from 'expo-image-picker';

export async function pickStudentPhoto(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    throw new Error('Permita acesso as fotos para selecionar a imagem do aluno.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    aspect: [1, 1],
    base64: true,
    mediaTypes: ['images'],
    quality: 0.55,
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset) return null;

  if (asset.base64) {
    return `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`;
  }

  return asset.uri;
}
