import 'package:flutter/material.dart';
import '../utils/error_handler.dart';

class ErrorDialog extends StatelessWidget {
  final AppException error;
  final VoidCallback? onRetry;

  const ErrorDialog({
    Key? key,
    required this.error,
    this.onRetry,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(_getErrorTitle()),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(ErrorHandler.getLocalizedMessage(error)),
            if (error is ValidationException) ...[
              const SizedBox(height: 16),
              ..._buildValidationErrors(error as ValidationException),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Fermer'),
        ),
        if (ErrorHandler.shouldRetry(error) && onRetry != null)
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              onRetry!();
            },
            child: const Text('Réessayer'),
          ),
      ],
    );
  }

  String _getErrorTitle() {
    switch (error.runtimeType) {
      case NetworkException:
        return 'Erreur de connexion';
      case AuthException:
        return 'Erreur d\'authentification';
      case ValidationException:
        return 'Données invalides';
      default:
        return 'Erreur';
    }
  }

  List<Widget> _buildValidationErrors(ValidationException error) {
    return error.errors.entries.map((entry) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 8.0),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.error_outline, size: 16, color: Colors.red),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                '${entry.key}: ${entry.value}',
                style: const TextStyle(color: Colors.red),
              ),
            ),
          ],
        ),
      );
    }).toList();
  }
}

class ErrorSnackBar extends SnackBar {
  ErrorSnackBar({
    Key? key,
    required AppException error,
    VoidCallback? onRetry,
  }) : super(
          key: key,
          content: Row(
            children: [
              const Icon(Icons.error_outline, color: Colors.white),
              const SizedBox(width: 8),
              Expanded(
                child: Text(ErrorHandler.getLocalizedMessage(error)),
              ),
              if (ErrorHandler.shouldRetry(error) && onRetry != null)
                TextButton(
                  onPressed: onRetry,
                  child: const Text(
                    'RÉESSAYER',
                    style: TextStyle(color: Colors.white),
                  ),
                ),
            ],
          ),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 4),
        );
}
