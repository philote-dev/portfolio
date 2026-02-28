# Animation Version Backups

This directory contains multiple versions of the neural network and quantum animations.

## Files:

### Neural Network:
- **neural.js** - Current active version (3D interactive with drag rotation and click cascades)
- **neural.3d.js** - Backup of the 3D version
- **neural.original.js** - Original simpler 2D version (before 3D enhancements)

### Quantum/Bloch Sphere:
- **quantum.js** - Current active version (immersive 3D with particles, trails, and wireframe sphere)
- **quantum.immersive.js** - Backup of the immersive version
- **quantum.original.js** - Original simpler 2D version (before immersive enhancements)

## To Switch Versions:

### Restore Original Neural Network:
```bash
cp neural.original.js neural.js
```

### Restore Original Quantum:
```bash
cp quantum.original.js quantum.js
```

### Restore 3D Neural Network:
```bash
cp neural.3d.js neural.js
```

### Restore Immersive Quantum:
```bash
cp quantum.immersive.js quantum.js
```

## Current Active Versions:
- Neural Network: **3D Interactive Version** (neural.js)
- Quantum: **Immersive 3D Version** (quantum.js)
