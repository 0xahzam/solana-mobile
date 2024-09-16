import React, { useState, useEffect } from "react";
import { View, Text, Button, Image, StyleSheet } from "react-native";
import { Camera } from "expo-camera";
import * as Location from "expo-location";
import { useMobileWallet } from "./src/hooks/useMobileWallet";
import { mintNFT } from "./src/utils/mintNFT";

export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [camera, setCamera] = useState(null);
  const [image, setImage] = useState(null);
  const [location, setLocation] = useState(null);
  const { wallet, connected, connectWallet } = useMobileWallet();

  useEffect(() => {
    (async () => {
      const { status: cameraStatus } =
        await Camera.requestCameraPermissionsAsync();
      const { status: locationStatus } =
        await Location.requestForegroundPermissionsAsync();
      setHasPermission(
        cameraStatus === "granted" && locationStatus === "granted"
      );
    })();
  }, []);

  const takePicture = async () => {
    if (camera) {
      const photo = await camera.takePictureAsync();
      setImage(photo.uri);

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    }
  };

  const handleMintNFT = async () => {
    if (!connected) {
      await connectWallet();
    }

    if (!image || !location || !wallet) {
      console.log("Image, location, or wallet not available");
      return;
    }

    try {
      const mintAddress = await mintNFT(
        wallet,
        image,
        location.coords.latitude,
        location.coords.longitude
      );
      console.log("NFT minted:", mintAddress);
      // TODO: Add user feedback for successful minting
    } catch (error) {
      console.error("Error minting NFT:", error);
      // TODO: Add user feedback for minting error
    }
  };

  if (hasPermission === null) {
    return <View />;
  }
  if (hasPermission === false) {
    return <Text>No access to camera or location</Text>;
  }

  return (
    <View style={styles.container}>
      <Camera style={styles.camera} ref={(ref) => setCamera(ref)}>
        <View style={styles.buttonContainer}>
          <Button title="Take Picture" onPress={takePicture} />
        </View>
      </Camera>
      {image && <Image source={{ uri: image }} style={styles.preview} />}
      <Button
        title="Mint NFT"
        onPress={handleMintNFT}
        disabled={!image || !location}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "center",
    margin: 20,
  },
  preview: {
    width: 200,
    height: 200,
    alignSelf: "center",
    margin: 20,
  },
});
