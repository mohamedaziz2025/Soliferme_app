import 'package:flutter/material.dart';
import 'package:ar_flutter_plugin/ar_flutter_plugin.dart';
import 'package:vector_math/vector_math_64.dart';
import 'package:provider/provider.dart';
import '../services/tree_service.dart';

/// Screen allowing the user to tap two points on a plane and record the
/// distance between them. Results can be saved to the current tree record.
class ARMeasurementScreen extends StatefulWidget {
  final String treeId;

  const ARMeasurementScreen({Key? key, required this.treeId}) : super(key: key);

  @override
  _ARMeasurementScreenState createState() => _ARMeasurementScreenState();
}

class _ARMeasurementScreenState extends State<ARMeasurementScreen> {
  late ARSessionManager _arSessionManager;
  late ARObjectManager _arObjectManager;
  late ARAnchorManager _arAnchorManager;
  late ARLocationManager _arLocationManager;

  ARPlaneAnchor? _firstAnchor;
  ARPlaneAnchor? _secondAnchor;
  double? _lastDistance;
  bool _saving = false;

  @override
  void dispose() {
    _arSessionManager.dispose();
    super.dispose();
  }

  void _onARViewCreated(
      ARSessionManager sessionManager,
      ARObjectManager objectManager,
      ARAnchorManager anchorManager,
      ARLocationManager locationManager) {
    _arSessionManager = sessionManager;
    _arObjectManager = objectManager;
    _arAnchorManager = anchorManager;
    _arLocationManager = locationManager;

    _arSessionManager.onPlaneOrPointTap = _handleTap;
    _arSessionManager.onInitialize(
      showFeaturePoints: false,
      showPlanes: true,
      handlePans: false,
      handleRotation: false,
    );
  }

  Future<void> _handleTap(List<ARHitTestResult> hits) async {
    if (hits.isEmpty) return;
    // take the first hit result
    final hit = hits.first;
    final anchor = ARPlaneAnchor(transformation: hit.worldTransform);

    if (_firstAnchor == null) {
      await _arAnchorManager.addAnchor(anchor);
      setState(() {
        _firstAnchor = anchor as ARPlaneAnchor;
      });
    } else if (_secondAnchor == null) {
      await _arAnchorManager.addAnchor(anchor);
      setState(() {
        _secondAnchor = anchor as ARPlaneAnchor;
      });
      final dist = await _arSessionManager.getDistanceBetweenAnchors(
          _firstAnchor!, _secondAnchor!);
      setState(() {
        _lastDistance = dist;
      });
    }
  }

  void _reset() {
    if (_firstAnchor != null) {
      _arAnchorManager.removeAnchor(_firstAnchor!);
    }
    if (_secondAnchor != null) {
      _arAnchorManager.removeAnchor(_secondAnchor!);
    }
    setState(() {
      _firstAnchor = null;
      _secondAnchor = null;
      _lastDistance = null;
    });
  }

  Future<void> _saveMeasurement() async {
    if (_lastDistance == null) return;
    setState(() {
      _saving = true;
    });
    try {
      final treeService = Provider.of<TreeService>(context, listen: false);
      await treeService.updateTree(widget.treeId, {
        'measurements': {
          'height': _lastDistance,
          // width is not computed here, client may re‑run and swap orientation
        }
      });
      if (mounted) Navigator.pop(context, _lastDistance);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Erreur lors de la sauvegarde : $e'),
        backgroundColor: Colors.red,
      ));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mesure AR'),
      ),
      body: Stack(
        children: [
          ARView(
            onARViewCreated: _onARViewCreated,
            planeDetectionConfig: PlaneDetectionConfig.horizontal,
          ),
          Positioned(
            bottom: 24,
            left: 24,
            right: 24,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_lastDistance != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.black54,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Semantics(
                      label: 'Distance mesurée',
                      value: '${_lastDistance!.toStringAsFixed(2)} mètres',
                      child: Text(
                        'Distance : ${_lastDistance!.toStringAsFixed(2)} m',
                        style: const TextStyle(color: Colors.white, fontSize: 18),
                      ),
                    ),
                  ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: Semantics(
                        button: true,
                        label: 'Bouton réinitialiser',
                        child: ElevatedButton(
                          onPressed: _reset,
                          child: const Text('Réinitialiser'),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Semantics(
                        button: true,
                        label: 'Bouton sauvegarder mesure',
                        child: ElevatedButton(
                          onPressed: (_lastDistance != null && !_saving)
                              ? _saveMeasurement
                              : null,
                          child: _saving
                              ? const SizedBox(
                                  height: 16,
                                  width: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Text('Sauvegarder'),
                        ),
                      ),
                    ),
                  ],
                )
              ],
            ),
          ),
        ],
      ),
    );
  }
}
