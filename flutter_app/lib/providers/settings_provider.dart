import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../models/user_settings.dart';
import '../services/settings_repository.dart';

part 'settings_provider.g.dart';

@riverpod
class UserSettingsState extends _$UserSettingsState {
  late final SettingsRepository _repo;

  @override
  Future<UserSettings> build() async {
    _repo = SettingsRepository();
    return await _repo.getSettings();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _repo.getSettings());
  }

  Future<void> save({
    bool? autoDeleteSpamEnabled,
    bool? autoSendRepliesEnabled,
    int? spamThreshold,
    int? responseConfidenceThreshold,
  }) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _repo.updateSettings(
          autoDeleteSpamEnabled: autoDeleteSpamEnabled,
          autoSendRepliesEnabled: autoSendRepliesEnabled,
          spamThreshold: spamThreshold,
          responseConfidenceThreshold: responseConfidenceThreshold,
        ));
  }
}
