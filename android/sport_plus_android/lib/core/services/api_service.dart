import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  late final Dio dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  final String baseUrl = 'https://sport-jmu3.onrender.com/api/v1';

  static const String tokenKey = 'sport_plus_jwt_token';

  ApiService._internal() {
    dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 60),
        receiveTimeout: const Duration(seconds: 60),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await getToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          if (error.response?.statusCode == 401) {
            await clearToken();
          }
          // Agar Render ulanishi xato bersa, lokal 10.0.2.2 ga urinib ko'rish
          if ((error.type == DioExceptionType.connectionError ||
               error.type == DioExceptionType.connectionTimeout) &&
              error.requestOptions.baseUrl.contains('onrender.com')) {
            try {
              final newOptions = error.requestOptions;
              newOptions.baseUrl = 'http://10.0.2.2:8000/api/v1';
              final retryRes = await dio.fetch(newOptions);
              return handler.resolve(retryRes);
            } catch (_) {
              return handler.next(error);
            }
          }
          return handler.next(error);
        },
      ),
    );
  }

  Future<void> saveToken(String token) async {
    await _storage.write(key: tokenKey, value: token);
  }

  Future<String?> getToken() async {
    return await _storage.read(key: tokenKey);
  }

  Future<void> clearToken() async {
    await _storage.delete(key: tokenKey);
  }

  Future<bool> isAuthenticated() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }
}
