export const onboardingSteps = [
  {
    key: 'healthConcern',
    question:
      '정확한 추천을 위해 연령대와 건강 고민을 알려주세요. 예: 40대 여성, 피로, 수면, 장 건강, 눈 건강',
    suggestions: [
      '40대 여성이고 요즘 피로랑 수면이 고민이에요',
      '장 건강이랑 다이어트가 고민이에요',
      '눈이 건조하고 피로감이 있어요',
      '갱년기랑 뼈 건강이 걱정돼요',
    ],
  },
  {
    key: 'safety',
    question:
      '좋아요. 안전한 추천을 위해 임신/수유/준비 여부와 지속적으로 앓고 있는 질환이 있는지 알려주세요. 예: 해당 없음, 임신 준비 중, 갑상선 질환, 고혈압',
    suggestions: [
      '임신은 아니고 특별한 질환은 없어요',
      '갑상선 질환으로 관리 중이에요',
      '고혈압이 있고 혈당도 신경 쓰고 있어요',
      '임신 준비 중이에요',
    ],
  },
  {
    key: 'medication',
    question:
      '현재 복용 중인 약이나 영양제가 있나요? 예: 없음, 혈압약, 당뇨약, 갑상선약, 피임약, 유산균, 오메가3',
    suggestions: [
      '복용 중인 약은 없고 유산균만 먹어요',
      '갑상선약을 먹고 있고 비타민D도 먹어요',
      '혈압약을 복용 중이에요',
      '오메가3랑 종합비타민을 먹고 있어요',
    ],
  },
  {
    key: 'lifestyle',
    question:
      '마지막으로 생활패턴과 주의사항을 알려주세요. 예: 수면 부족, 야근/돌봄 부담, 운동 부족, 카페인 제외, 구미 선호',
    suggestions: [
      '수면 부족하고 야근이 많아요. 카페인은 피하고 싶어요',
      '운동이 부족하고 배달 음식을 자주 먹어요',
      '알약보다 구미나 액상이 좋아요',
      '스트레스가 많고 커피를 자주 마셔요',
    ],
  },
];

export const onboardingQuestions = {
  healthConcern: onboardingSteps[0].question,
  safety: onboardingSteps[1].question,
  medication: onboardingSteps[2].question,
  lifestyle: onboardingSteps[3].question,
  completed:
    '좋아요. 알려주신 내용을 저장했어요. 이제 추천받고 싶은 고민이나 영양제를 물어보면 맞춤 추천으로 이어가겠습니다.',
};
