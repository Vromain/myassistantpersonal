import 'package:freezed_annotation/freezed_annotation.dart';
import 'message.dart';

part 'message_analysis.freezed.dart';
part 'message_analysis.g.dart';

/// Message Analysis Model
/// Task: T029 - Create MessageAnalysis Freezed model
/// Reference: specs/002-intelligent-message-analysis/plan.md

enum Sentiment {
  positive,
  neutral,
  negative,
}

@freezed
class MessageAnalysis with _$MessageAnalysis {
  const MessageAnalysis._();

  const factory MessageAnalysis({
    required String id,
    required String messageId,
    required DateTime analysisTimestamp,
    @Default(0.0) double spamProbability,
    @Default(false) bool isSpam,
    @Default(false) bool needsResponse,
    @Default(0.0) double responseConfidence,
    @Default(Sentiment.neutral) Sentiment sentiment,
    @Default(PriorityLevel.medium) PriorityLevel priorityLevel,
    String? generatedReplyText,
    @Default('1.0') String analysisVersion,
  }) = _MessageAnalysis;

  factory MessageAnalysis.fromJson(Map<String, dynamic> json) =>
      _$MessageAnalysisFromJson(json);

  // Computed properties
  bool get isLikelySpam => spamProbability > 70.0;
  bool get isDefinitelySpam => spamProbability > 90.0;
  bool get shouldGenerateReply => needsResponse && responseConfidence > 60.0;
  bool get hasGeneratedReply => generatedReplyText != null && generatedReplyText!.isNotEmpty;

  String get sentimentLabel {
    switch (sentiment) {
      case Sentiment.positive:
        return 'Positif';
      case Sentiment.neutral:
        return 'Neutre';
      case Sentiment.negative:
        return 'Négatif';
    }
  }

  String get spamLabel {
    if (isDefinitelySpam) return 'Spam confirmé';
    if (isLikelySpam) return 'Spam probable';
    if (spamProbability > 40.0) return 'Spam possible';
    return 'Pas de spam';
  }
}
