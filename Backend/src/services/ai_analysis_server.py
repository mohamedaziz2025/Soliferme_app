"""Standalone AI analysis API consumed by the Node backend."""

from datetime import datetime, timezone
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import logging
import os
import sys
import tempfile
import uuid
from werkzeug.utils import secure_filename

# Add AI folder to Python path for model code.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'AI'))

try:
    from tree_analysis_service import get_analysis_service
except ImportError:
    print('Warning: full AI service not found, basic mode enabled')
    get_analysis_service = None

app = Flask(__name__)
CORS(app)

API_VERSION = '2.0.0'
UPLOAD_FOLDER = tempfile.gettempdir()
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
STRICT_REAL_AI = os.environ.get('AI_REQUIRE_REAL_MODEL', 'true').strip().lower() in ('1', 'true', 'yes', 'on')

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def _parse_json_form_field(field_name):
    raw = request.form.get(field_name)
    if raw is None or raw == '':
        return None, None

    try:
        return json.loads(raw), None
    except json.JSONDecodeError:
        return None, f"Invalid JSON for field '{field_name}'"


def _safe_remove(path):
    try:
        os.remove(path)
    except OSError:
        pass


def _normalize_result(raw_result):
    if not isinstance(raw_result, dict):
        return {
            'success': False,
            'error': 'Invalid analysis payload returned by model service',
            'diseaseDetection': {
                'detected': False,
                'diseases': [],
                'overallHealthScore': 0,
            },
            'treeAnalysis': {},
            'metadata': {},
        }

    disease_detection = raw_result.get('diseaseDetection')
    if not isinstance(disease_detection, dict):
        disease_detection = {
            'detected': False,
            'diseases': [],
            'overallHealthScore': 0,
        }

    tree_analysis = raw_result.get('treeAnalysis')
    if not isinstance(tree_analysis, dict):
        tree_analysis = {}

    metadata = raw_result.get('metadata') if isinstance(raw_result.get('metadata'), dict) else {}
    if 'analysisMethod' in raw_result and 'analysisMethod' not in metadata:
        metadata['analysisMethod'] = raw_result['analysisMethod']

    normalized = {
        'success': bool(raw_result.get('success', True)),
        'diseaseDetection': disease_detection,
        'treeAnalysis': tree_analysis,
        'metadata': metadata,
    }

    if not normalized['success']:
        normalized['error'] = raw_result.get('error', 'AI analysis failed')

    return normalized


def _build_response_metadata(request_id, tree_type, gps_data, measurements):
    return {
        'requestId': request_id,
        'apiVersion': API_VERSION,
        'processedAt': datetime.now(timezone.utc).isoformat(),
        'mode': 'full' if _is_full_ai_ready()[0] else 'basic',
        'treeType': tree_type,
        'gpsData': gps_data,
        'measurements': measurements,
    }


def _is_full_ai_ready():
    """Check if the full model pipeline is available and loaded."""
    if not get_analysis_service:
        return False, 'Model service import failed'

    try:
        service = get_analysis_service()
    except Exception as exc:
        return False, f'Model service init failed: {exc}'

    if service is None:
        return False, 'Model service is unavailable'

    # TreeAnalysisService exposes YOLO model on yolo_model when loaded.
    if getattr(service, 'yolo_model', None) is None:
        return False, 'YOLO model is not loaded'

    return True, None


@app.route('/health', methods=['GET'])
@app.route('/api/v1/health', methods=['GET'])
def health_check():
    full_ai_ready, reason = _is_full_ai_ready()
    healthy = full_ai_ready or (not STRICT_REAL_AI)
    status_code = 200 if healthy else 503

    return jsonify({
        'status': 'healthy' if healthy else 'unhealthy',
        'service': 'AI Analysis Service',
        'version': API_VERSION,
        'mode': 'full' if full_ai_ready else 'basic',
        'strictRealAi': STRICT_REAL_AI,
        'ready': full_ai_ready,
        'reason': reason,
        'endpoints': {
            'analyze': '/api/v1/analyze',
            'batchAnalyze': '/api/v1/batch-analyze',
        },
    }), status_code


@app.route('/analyze', methods=['POST'])
@app.route('/api/v1/analyze', methods=['POST'])
def analyze_tree():
    temp_path = None

    try:
        full_ai_ready, reason = _is_full_ai_ready()
        if STRICT_REAL_AI and not full_ai_ready:
            return jsonify({
                'success': False,
                'error': 'AI model is unavailable. Real analysis is required in strict mode.',
                'code': 'AI_MODEL_NOT_READY',
                'details': reason,
            }), 503

        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'Empty filename'}), 400

        if not allowed_file(file.filename):
            return jsonify({'success': False, 'error': 'Unsupported file type'}), 400

        gps_data, gps_error = _parse_json_form_field('gps_data')
        if gps_error:
            return jsonify({'success': False, 'error': gps_error}), 400

        measurements, measurements_error = _parse_json_form_field('measurements')
        if measurements_error:
            return jsonify({'success': False, 'error': measurements_error}), 400

        request_id = str(uuid.uuid4())
        filename = secure_filename(file.filename)
        file_ext = os.path.splitext(filename)[1].lower() or '.jpg'
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], f'tree_analysis_{request_id}{file_ext}')
        file.save(temp_path)
        logger.info('Analyzing image %s', temp_path)

        if full_ai_ready:
            service = get_analysis_service()
            raw_results = service.analyze_image(temp_path)
        else:
            raw_results = _basic_analysis(temp_path)

        normalized = _normalize_result(raw_results)
        metadata = normalized.get('metadata', {})
        metadata.update(
            _build_response_metadata(
                request_id=request_id,
                tree_type=request.form.get('tree_type', 'unspecified'),
                gps_data=gps_data,
                measurements=measurements,
            )
        )
        normalized['metadata'] = metadata

        status_code = 200 if normalized.get('success') else 502
        return jsonify(normalized), status_code

    except Exception as exc:
        logger.exception('Error while analyzing image')
        return jsonify({'success': False, 'error': str(exc)}), 500
    finally:
        if temp_path:
            _safe_remove(temp_path)


def _basic_analysis(image_path):
    """Basic image analysis used when full model stack is not available."""
    import cv2
    import numpy as np

    try:
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError('Unable to read image')

        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        hsv = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2HSV)

        green_mask = cv2.inRange(hsv, np.array([35, 40, 40]), np.array([85, 255, 255]))
        green_ratio = float(np.sum(green_mask > 0)) / float(green_mask.size)

        health_score = int(green_ratio * 150)
        health_score = min(100, max(0, health_score))

        diseases = []

        yellow_mask = cv2.inRange(hsv, np.array([20, 100, 100]), np.array([40, 255, 255]))
        yellow_ratio = float(np.sum(yellow_mask > 0)) / float(yellow_mask.size)
        if yellow_ratio > 0.15:
            diseases.append({
                'name': 'Possible chlorosis',
                'confidence': min(yellow_ratio * 400, 85),
                'severity': 'medium',
                'affectedArea': 'Foliage',
                'recommendations': [
                    'Check nutrient balance',
                    'Check soil pH',
                    'Adjust fertilizer inputs',
                ],
            })

        brown_mask = cv2.inRange(hsv, np.array([10, 50, 20]), np.array([20, 200, 100]))
        brown_ratio = float(np.sum(brown_mask > 0)) / float(brown_mask.size)
        if brown_ratio > 0.10:
            diseases.append({
                'name': 'Possible tissue necrosis',
                'confidence': min(brown_ratio * 500, 80),
                'severity': 'medium',
                'affectedArea': 'Leaf areas',
                'recommendations': [
                    'Prune affected parts',
                    'Apply preventive treatment',
                    'Monitor progression',
                ],
            })

        return {
            'success': True,
            'diseaseDetection': {
                'detected': len(diseases) > 0,
                'diseases': diseases,
                'overallHealthScore': health_score,
            },
            'treeAnalysis': {
                'species': 'Unknown',
                'foliageDensity': int(green_ratio * 100),
                'structuralIntegrity': 75,
                'growthIndicators': {
                    'newGrowth': health_score > 70,
                    'leafColor': 'Green' if health_score > 70 else 'Variable',
                    'branchHealth': 'Normal',
                },
            },
            'metadata': {
                'analysisMethod': 'basic_color_analysis',
            },
        }

    except Exception as exc:
        return {
            'success': False,
            'error': str(exc),
            'diseaseDetection': {
                'detected': False,
                'diseases': [],
                'overallHealthScore': 50,
            },
            'treeAnalysis': {},
            'metadata': {
                'analysisMethod': 'basic_color_analysis',
            },
        }


@app.route('/batch-analyze', methods=['POST'])
@app.route('/api/v1/batch-analyze', methods=['POST'])
def batch_analyze():
    try:
        full_ai_ready, reason = _is_full_ai_ready()
        if STRICT_REAL_AI and not full_ai_ready:
            return jsonify({
                'success': False,
                'error': 'AI model is unavailable. Real analysis is required in strict mode.',
                'code': 'AI_MODEL_NOT_READY',
                'details': reason,
            }), 503

        files = request.files.getlist('files')
        if not files:
            return jsonify({'success': False, 'error': 'No files provided'}), 400

        batch_request_id = str(uuid.uuid4())
        results = []

        for file in files:
            temp_path = None
            if not file or file.filename == '' or not allowed_file(file.filename):
                continue

            try:
                filename = secure_filename(file.filename)
                file_ext = os.path.splitext(filename)[1].lower() or '.jpg'
                temp_path = os.path.join(app.config['UPLOAD_FOLDER'], f'batch_{uuid.uuid4()}{file_ext}')
                file.save(temp_path)

                if full_ai_ready:
                    service = get_analysis_service()
                    raw_result = service.analyze_image(temp_path)
                else:
                    raw_result = _basic_analysis(temp_path)

                normalized = _normalize_result(raw_result)
                normalized['filename'] = filename
                results.append(normalized)
            finally:
                if temp_path:
                    _safe_remove(temp_path)

        return jsonify({
            'success': True,
            'requestId': batch_request_id,
            'total': len(results),
            'results': results,
            'metadata': {
                'apiVersion': API_VERSION,
                'mode': 'full' if full_ai_ready else 'basic',
            },
        })

    except Exception as exc:
        logger.exception('Batch analysis failed')
        return jsonify({'success': False, 'error': str(exc)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('AI_SERVICE_PORT', 5001))
    logger.info('Starting AI service on port %s', port)
    logger.info('Upload folder: %s', UPLOAD_FOLDER)
    logger.info('Strict real AI mode: %s', STRICT_REAL_AI)

    full_ai_ready, reason = _is_full_ai_ready()
    if full_ai_ready:
        logger.info('Full AI mode is active')
    else:
        logger.warning('Full AI mode unavailable: %s', reason)
        if STRICT_REAL_AI:
            logger.error('Strict mode enabled: API will reject analysis requests until model is ready')
        else:
            logger.warning('Fallback basic mode is allowed because strict mode is disabled')

    app.run(
        host='0.0.0.0',
        port=port,
        debug=os.environ.get('DEBUG', 'False') == 'True',
    )
