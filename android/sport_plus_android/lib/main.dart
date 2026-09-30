import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'core/services/api_service.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/presentation/login_screen.dart';
import 'features/navigation/main_navigation_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Edge to Edge transparent system navigation
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: Colors.transparent,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );

  final api = ApiService();
  final isAuthenticated = await api.isAuthenticated();

  runApp(SportPlusAndroidApp(isAuthenticated: isAuthenticated));
}

class SportPlusAndroidApp extends StatelessWidget {
  final bool isAuthenticated;

  const SportPlusAndroidApp({super.key, required this.isAuthenticated});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SPORT+',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: isAuthenticated ? const MainNavigationScreen() : const LoginScreen(),
    );
  }
}
