import '../models/user_settings.dart';
import 'api_client.dart';
import 'dio_client.dart';

class SettingsRepository {
  late final ApiClient _apiClient;

  SettingsRepository() {
    _apiClient = ApiClient(DioClient.instance);
  }

  Future<UserSettings> getSettings() async {
    final resp = await _apiClient.getUserSettings();
    return UserSettings.fromJson(resp as Map<String, dynamic>);
  }

  Future<UserSettings> updateSettings({
    bool? autoDeleteSpamEnabled,
    bool? autoSendRepliesEnabled,
    int? spamThreshold,
    int? responseConfidenceThreshold,
  }) async {
    final payload = <String, dynamic>{
      if (autoDeleteSpamEnabled != null)
        'autoDeleteSpamEnabled': autoDeleteSpamEnabled,
      if (autoSendRepliesEnabled != null)
        'autoSendRepliesEnabled': autoSendRepliesEnabled,
      if (spamThreshold != null) 'spamThreshold': spamThreshold,
      if (responseConfidenceThreshold != null)
        'responseConfidenceThreshold': responseConfidenceThreshold,
    };
    final resp = await _apiClient.updateUserSettings(payload);
    final settings = (resp['settings'] ?? resp) as Map<String, dynamic>;
    return UserSettings.fromJson(settings);
  }
}
