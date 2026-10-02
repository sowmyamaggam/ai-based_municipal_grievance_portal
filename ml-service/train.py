import argparse
import json
from pathlib import Path

import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

IMAGE_SIZE = (224, 224)
BATCH_SIZE = 32
SEED = 42


def main() -> None:
    parser = argparse.ArgumentParser(description="Train the municipal complaint image classifier.")
    parser.add_argument("--data", required=True, help="Folder containing one subfolder per class")
    parser.add_argument("--output", default="artifacts/municipal-image-model.keras")
    parser.add_argument("--epochs", type=int, default=12)
    args = parser.parse_args()

    data_dir = Path(args.data)
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    train_ds = keras.utils.image_dataset_from_directory(
        data_dir,
        validation_split=0.2,
        subset="training",
        seed=SEED,
        image_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
    )
    validation_ds = keras.utils.image_dataset_from_directory(
        data_dir,
        validation_split=0.2,
        subset="validation",
        seed=SEED,
        image_size=IMAGE_SIZE,
        batch_size=BATCH_SIZE,
    )

    class_names = train_ds.class_names
    with output_path.with_suffix(".classes.json").open("w", encoding="utf-8") as file:
        json.dump(class_names, file, indent=2)

    autotune = tf.data.AUTOTUNE
    train_ds = train_ds.cache().prefetch(autotune)
    validation_ds = validation_ds.cache().prefetch(autotune)

    augmentation = keras.Sequential([
        layers.RandomFlip("horizontal"),
        layers.RandomRotation(0.08),
        layers.RandomZoom(0.1),
    ])
    base = keras.applications.MobileNetV2(
        input_shape=(*IMAGE_SIZE, 3), include_top=False, weights="imagenet"
    )
    base.trainable = False

    inputs = keras.Input(shape=(*IMAGE_SIZE, 3))
    x = augmentation(inputs)
    x = keras.applications.mobilenet_v2.preprocess_input(x)
    x = base(x, training=False)
    x = layers.GlobalAveragePooling2D()(x)
    x = layers.Dropout(0.25)(x)
    outputs = layers.Dense(len(class_names), activation="softmax")(x)
    model = keras.Model(inputs, outputs)
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.0001),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    model.fit(train_ds, validation_data=validation_ds, epochs=args.epochs)
    model.save(output_path)
    print(f"Saved model to {output_path}")
    print(f"Classes: {', '.join(class_names)}")


if __name__ == "__main__":
    main()
