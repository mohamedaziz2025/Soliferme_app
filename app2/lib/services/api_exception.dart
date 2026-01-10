class ApiException implements Exception {
  final String message;
  final int statusCode;

  ApiException(this.message, this.statusCode);

  factory ApiException.fromStatusCode(int statusCode, {String? details}) {
    String message;
    switch (statusCode) {
      case 400:
        message = details ?? 'Requête invalide';
        break;
      case 401:
        message = details ?? 'Non autorisé. Veuillez vous reconnecter.';
        break;
      case 403:
        message = details ?? 'Accès refusé';
        break;
      case 404:
        message = details ?? 'Ressource non trouvée';
        break;
      case 409:
        message = details ?? 'Conflit avec les données existantes';
        break;
      case 422:
        message = details ?? 'Les données fournies sont invalides';
        break;
      case 500:
        message = details ?? 'Erreur interne du serveur';
        break;
      default:
        message = details ?? 'Une erreur est survenue';
    }
    return ApiException(message, statusCode);
  }

  @override
  String toString() => message;
}