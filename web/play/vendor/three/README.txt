three.js r160 (MIT), from npm three@0.160.0 — only the files the 3D view needs.

Local patch: examples/jsm/loaders/FBXLoader.js skips a broken animation track (no keyframes)
instead of failing the whole model (needed for SM_Vehicle_Rover.fbx). Search "BeibitAI patch".
