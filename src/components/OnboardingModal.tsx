"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ===== Types =====

interface SkillOption {
  key: string;
  name: string;
  category: string;
}

interface OnboardingModalProps {
  userId: string;
  initialStep: number; // 0 = fresh start, 1-8 = resume from step
  onComplete: () => void;
  onDismiss: () => void;
}

// ===== Constants =====

const AGE_GROUPS = [
  { value: "under5", label: "〜5歳", emoji: "👶" },
  { value: "6-9", label: "6〜9歳", emoji: "🧒" },
  { value: "10-12", label: "10〜12歳", emoji: "🧑" },
  { value: "13-15", label: "13〜15歳", emoji: "🧑‍🎓" },
  { value: "16-18", label: "16〜18歳", emoji: "💪" },
  { value: "19-29", label: "19〜29歳", emoji: "🏃" },
  { value: "30-39", label: "30〜39歳", emoji: "🧘" },
  { value: "40plus", label: "40歳以上", emoji: "🌟" },
];

const ATTRIBUTES = [
  { value: "dancer", label: "ダンサー", sub: "ヒップホップ・バレエ・ジャズ・ストリート", emoji: "💃" },
  { value: "cheer_dance", label: "チアダンス", sub: "", emoji: "📣" },
  { value: "cheerleading", label: "チアリーディング", sub: "", emoji: "🎀" },
  { value: "school_sports", label: "部活・体育で使いたい", sub: "", emoji: "🏫" },
  { value: "gymnastics", label: "体操・新体操・アクロバット経験者", sub: "", emoji: "🤸" },
  { value: "performer", label: "パフォーマー・俳優・ミュージカル", sub: "", emoji: "🎭" },
  { value: "dream", label: "昔からの憧れ・やってみたかった", sub: "", emoji: "✨" },
  { value: "hobby", label: "新しい趣味として始めたい", sub: "", emoji: "🌱" },
  { value: "family", label: "親子で楽しみたい", sub: "", emoji: "👨‍👧" },
  { value: "health", label: "健康・運動不足解消・ダイエット", sub: "", emoji: "❤️" },
  { value: "other", label: "その他", sub: "", emoji: "🔮" },
];

const PRACTICE_FREQUENCIES = [
  { value: "daily", label: "毎日", emoji: "🔥" },
  { value: "weekly", label: "週3〜5回", emoji: "💪" },
  { value: "biweekly", label: "週1〜2回", emoji: "👍" },
  { value: "monthly", label: "月数回", emoji: "📅" },
  { value: "irregular", label: "気が向いた時に", emoji: "🌊" },
];

const SKILL_CATEGORIES: { key: string; label: string; emoji: string }[] = [
  { key: "forward", label: "前方系", emoji: "🔵" },
  { key: "side", label: "側方系", emoji: "🟣" },
  { key: "backward", label: "後方系", emoji: "🟢" },
  { key: "special", label: "スペシャル", emoji: "✨" },
];

const TOTAL_STEPS = 9; // 1=welcome, 2-8=questions, 9=complete

// ===== Confetti Component =====

function MiniConfetti() {
  const particles = Array.from({ length: 30 }, (_, i) => i);
  const colors = ["#ff6b6b", "#feca57", "#48dbfb", "#ff9ff3", "#54a0ff", "#5f27cd"];
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
      {particles.map((i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.3;
        const duration = 1.2 + Math.random() * 1;
        const color = colors[i % colors.length];
        const size = 4 + Math.random() * 6;
        return (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${left}%`,
              top: "-5%",
              animation: `confettiDrop ${duration}s ease-out ${delay}s forwards`,
            }}
          >
            <div style={{ width: `${size}px`, height: `${size * 0.6}px`, backgroundColor: color, borderRadius: "2px", transform: `rotate(${Math.random() * 360}deg)` }} />
          </div>
        );
      })}
      <style>{`
        @keyframes confettiDrop {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(500px) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ===== Progress Bar =====

function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.min(((step - 1) / (total - 1)) * 100, 100);
  return (
    <div className="mb-6">
      <div className="flex justify-between text-xs text-gray-400 mb-1.5">
        <span>{step}/{total}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ===== Skill Picker (shared between Step 4, 5, 8) =====

function SkillPicker({
  skills,
  selected,
  onToggle,
  multi,
}: {
  skills: SkillOption[];
  selected: string[];
  onToggle: (key: string) => void;
  multi: boolean;
}) {
  const [activeTab, setActiveTab] = useState(SKILL_CATEGORIES[0].key);
  const filtered = skills.filter(s => s.category === activeTab);

  return (
    <div>
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        {SKILL_CATEGORIES.map(cat => {
          const count = skills.filter(s => s.category === cat.key).length;
          if (count === 0) return null;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveTab(cat.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                activeTab === cat.key
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[240px] overflow-y-auto pr-1">
        {filtered.map(skill => {
          const isOn = selected.includes(skill.key);
          return (
            <button
              key={skill.key}
              onClick={() => onToggle(skill.key)}
              className={`px-3 py-2.5 rounded-xl text-xs font-bold text-left transition border-2 ${
                isOn
                  ? "bg-purple-100 border-purple-400 text-purple-700"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {isOn ? "✅ " : ""}{skill.name}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-4 text-gray-400 text-xs">このカテゴリに技がありません</div>
        )}
      </div>
      {multi && selected.length > 0 && (
        <p className="text-xs text-purple-500 mt-2 font-medium">{selected.length}つ選択中</p>
      )}
    </div>
  );
}

// ===== Main Component =====

export default function OnboardingModal({ userId, initialStep, onComplete, onDismiss }: OnboardingModalProps) {
  const [step, setStep] = useState(Math.max(1, initialStep || 1));
  const [saving, setSaving] = useState(false);
  const [skills, setSkills] = useState<SkillOption[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

  // Answers
  const [ageGroup, setAgeGroup] = useState<string | null>(null);
  const [attribute, setAttribute] = useState<string | null>(null);
  const [shortTermGoals, setShortTermGoals] = useState<string[]>([]);
  const [longTermDream, setLongTermDream] = useState("");
  const [longTermSkill, setLongTermSkill] = useState<string | null>(null);
  const [selfImage, setSelfImage] = useState("");
  const [practiceFreq, setPracticeFreq] = useState<string | null>(null);
  const [selfReportedSkills, setSelfReportedSkills] = useState<string[]>([]);

  // Load existing answers + skills
  useEffect(() => {
    async function load() {
      const [onboardingRes, checklistRes] = await Promise.all([
        fetch("/api/onboarding").then(r => r.json()),
        fetch("/api/admin/checklist").then(r => r.json()),
      ]);

      // Restore answers
      if (onboardingRes.data) {
        const d = onboardingRes.data;
        if (d.onboarding_age_group) setAgeGroup(d.onboarding_age_group);
        if (d.onboarding_attribute) setAttribute(d.onboarding_attribute);
        if (d.onboarding_short_term_goals) setShortTermGoals(d.onboarding_short_term_goals);
        if (d.onboarding_long_term_dream) setLongTermDream(d.onboarding_long_term_dream);
        if (d.onboarding_self_image) setSelfImage(d.onboarding_self_image);
        if (d.onboarding_practice_frequency) setPracticeFreq(d.onboarding_practice_frequency);
        if (d.onboarding_self_reported_skills) setSelfReportedSkills(d.onboarding_self_reported_skills);
      }

      // Build skill list from DB
      const categories = checklistRes.data || [];
      const skillList: SkillOption[] = [];
      for (const cat of categories) {
        for (const sk of cat.skills) {
          // Map DB category to our display categories
          const skillCat = sk.skill_category || mapCategoryKey(cat.key);
          if (sk.is_tutorial) continue; // Skip tutorial skills
          skillList.push({ key: sk.skill_key, name: sk.name, category: skillCat });
        }
      }
      setSkills(skillList);
    }
    load();
  }, []);

  function mapCategoryKey(catKey: string): string {
    switch (catKey) {
      case "front": return "forward";
      case "back": return "backward";
      case "side": return "side";
      case "combo": return "side";
      case "special": return "special";
      default: return "forward";
    }
  }

  const saveStep = useCallback(async (stepNum: number, answers: Record<string, unknown> = {}) => {
    setSaving(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: stepNum, answers }),
      });
    } finally {
      setSaving(false);
    }
  }, []);

  async function goNext(answers: Record<string, unknown> = {}) {
    const nextStep = step + 1;
    await saveStep(nextStep, answers);
    if (nextStep >= TOTAL_STEPS) {
      setStep(TOTAL_STEPS);
      setShowConfetti(true);
    } else {
      setStep(nextStep);
    }
  }

  async function skip() {
    await goNext({});
  }

  function handleDismiss() {
    // Save current step before closing
    saveStep(step);
    onDismiss();
  }

  function handleComplete() {
    onComplete();
  }

  // Toggle for multi-select
  function toggleSkillGoal(key: string) {
    setShortTermGoals(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  function toggleSelfSkill(key: string) {
    setSelfReportedSkills(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  }

  // Animation variants
  const slideVariants = {
    enter: { x: 60, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -60, opacity: 0 },
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleDismiss}
      />

      {/* Modal */}
      <motion.div
        className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {showConfetti && <MiniConfetti />}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
          {step > 1 && step < TOTAL_STEPS && (
            <ProgressBar step={step} total={TOTAL_STEPS} />
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {/* Step 1: Welcome */}
              {step === 1 && (
                <div className="text-center py-4">
                  <div className="text-5xl mb-4">✨</div>
                  <h2 className="text-xl font-extrabold text-gray-800 mb-3">冒険のはじまりだ</h2>
                  <p className="text-sm text-gray-500 leading-relaxed mb-6">
                    あなたにピッタリのバクトレ体験を作るために、<br />
                    いくつか質問させてください。<br />
                    全部で7問、所要時間約2分です。<br />
                    <span className="text-purple-500 font-bold">スキップもOK！</span>
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={() => goNext()}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold text-base shadow-lg hover:shadow-xl transition"
                    >
                      はじめる
                    </button>
                    <button
                      onClick={handleDismiss}
                      className="w-full py-3 rounded-2xl bg-gray-100 text-gray-500 font-medium text-sm hover:bg-gray-200 transition"
                    >
                      あとでやる
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Age Group */}
              {step === 2 && (
                <div>
                  <h3 className="text-lg font-extrabold text-gray-800 mb-1">👋 あなたの年齢は？</h3>
                  <p className="text-xs text-gray-400 mb-4">お子さんの場合はお子さんの年齢を教えてください</p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {AGE_GROUPS.map(ag => (
                      <button
                        key={ag.value}
                        onClick={() => setAgeGroup(ag.value)}
                        className={`px-3 py-3 rounded-xl text-sm font-bold transition border-2 ${
                          ageGroup === ag.value
                            ? "bg-purple-100 border-purple-400 text-purple-700"
                            : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {ag.emoji} {ag.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => goNext({ age_group: ageGroup })}
                      disabled={!ageGroup || saving}
                      className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold disabled:opacity-40 transition"
                    >
                      次へ
                    </button>
                    <button onClick={skip} className="px-4 py-3 rounded-2xl bg-gray-100 text-gray-400 text-sm font-medium hover:bg-gray-200 transition">
                      スキップ
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Attribute */}
              {step === 3 && (
                <div>
                  <h3 className="text-lg font-extrabold text-gray-800 mb-1">🎯 あなたを一言で表すと？</h3>
                  <p className="text-xs text-gray-400 mb-4">一番近いものを1つ選んでください</p>
                  <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1 mb-4">
                    {ATTRIBUTES.map(attr => (
                      <button
                        key={attr.value}
                        onClick={() => setAttribute(attr.value)}
                        className={`px-4 py-3 rounded-xl text-left transition border-2 ${
                          attribute === attr.value
                            ? "bg-purple-100 border-purple-400"
                            : "bg-white border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <span className="text-sm font-bold text-gray-700">
                          {attr.emoji} {attr.label}
                        </span>
                        {attr.sub && (
                          <span className="text-xs text-gray-400 ml-1">({attr.sub})</span>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => goNext({ attribute })}
                      disabled={!attribute || saving}
                      className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold disabled:opacity-40 transition"
                    >
                      次へ
                    </button>
                    <button onClick={skip} className="px-4 py-3 rounded-2xl bg-gray-100 text-gray-400 text-sm font-medium hover:bg-gray-200 transition">
                      スキップ
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Short-term Goals */}
              {step === 4 && (
                <div>
                  <h3 className="text-lg font-extrabold text-gray-800 mb-1">🎯 3ヶ月以内の目標</h3>
                  <p className="text-xs text-gray-400 mb-4">できるようになりたい技を選んでね（複数OK）</p>
                  <SkillPicker
                    skills={skills}
                    selected={shortTermGoals}
                    onToggle={toggleSkillGoal}
                    multi
                  />
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => goNext({ short_term_goals: shortTermGoals })}
                      disabled={saving}
                      className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold disabled:opacity-40 transition"
                    >
                      {shortTermGoals.length > 0 ? `${shortTermGoals.length}つ選んで次へ` : "次へ"}
                    </button>
                    <button onClick={skip} className="px-4 py-3 rounded-2xl bg-gray-100 text-gray-400 text-sm font-medium hover:bg-gray-200 transition">
                      スキップ
                    </button>
                  </div>
                </div>
              )}

              {/* Step 5: Long-term Dream */}
              {step === 5 && (
                <div>
                  <h3 className="text-lg font-extrabold text-gray-800 mb-1">🌟 いつかは…！</h3>
                  <p className="text-xs text-gray-400 mb-4">憧れの技や目標を教えてください</p>

                  <div className="mb-4">
                    <p className="text-xs font-bold text-purple-600 mb-2">憧れの技を選ぶ</p>
                    <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto">
                      {skills.map(skill => (
                        <button
                          key={skill.key}
                          onClick={() => setLongTermSkill(prev => prev === skill.key ? null : skill.key)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition border ${
                            longTermSkill === skill.key
                              ? "bg-purple-100 border-purple-400 text-purple-700"
                              : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                          }`}
                        >
                          {longTermSkill === skill.key ? "✅ " : ""}{skill.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs font-bold text-purple-600 mb-2">またはフリーで書く</p>
                    <textarea
                      value={longTermDream}
                      onChange={e => setLongTermDream(e.target.value)}
                      placeholder="例: バク宙をビーチでキメたい！"
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:border-purple-400 focus:outline-none resize-none"
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const dream = longTermSkill
                          ? (longTermDream ? `${longTermSkill}|${longTermDream}` : longTermSkill)
                          : longTermDream;
                        goNext({ long_term_dream: dream });
                      }}
                      disabled={saving}
                      className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold disabled:opacity-40 transition"
                    >
                      次へ
                    </button>
                    <button onClick={skip} className="px-4 py-3 rounded-2xl bg-gray-100 text-gray-400 text-sm font-medium hover:bg-gray-200 transition">
                      スキップ
                    </button>
                  </div>
                </div>
              )}

              {/* Step 6: Self Image */}
              {step === 6 && (
                <div>
                  <h3 className="text-lg font-extrabold text-gray-800 mb-1">💭 どんな自分になりたい？</h3>
                  <p className="text-xs text-gray-400 mb-4">想いを聞かせてください</p>
                  <textarea
                    value={selfImage}
                    onChange={e => setSelfImage(e.target.value)}
                    placeholder="例：友達の前でかっこよくバク転を決めたい！ / 子供と一緒に運動を楽しみたい / 健康的な体になりたい"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 focus:border-purple-400 focus:outline-none resize-none mb-4"
                    rows={4}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => goNext({ self_image: selfImage })}
                      disabled={saving}
                      className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold disabled:opacity-40 transition"
                    >
                      次へ
                    </button>
                    <button onClick={skip} className="px-4 py-3 rounded-2xl bg-gray-100 text-gray-400 text-sm font-medium hover:bg-gray-200 transition">
                      スキップ
                    </button>
                  </div>
                </div>
              )}

              {/* Step 7: Practice Frequency */}
              {step === 7 && (
                <div>
                  <h3 className="text-lg font-extrabold text-gray-800 mb-1">📅 練習ペースは？</h3>
                  <p className="text-xs text-gray-400 mb-4">だいたいで大丈夫です</p>
                  <div className="space-y-2 mb-4">
                    {PRACTICE_FREQUENCIES.map(pf => (
                      <button
                        key={pf.value}
                        onClick={() => setPracticeFreq(pf.value)}
                        className={`w-full px-4 py-3.5 rounded-xl text-left text-sm font-bold transition border-2 ${
                          practiceFreq === pf.value
                            ? "bg-purple-100 border-purple-400 text-purple-700"
                            : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        {pf.emoji} {pf.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => goNext({ practice_frequency: practiceFreq })}
                      disabled={!practiceFreq || saving}
                      className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold disabled:opacity-40 transition"
                    >
                      次へ
                    </button>
                    <button onClick={skip} className="px-4 py-3 rounded-2xl bg-gray-100 text-gray-400 text-sm font-medium hover:bg-gray-200 transition">
                      スキップ
                    </button>
                  </div>
                </div>
              )}

              {/* Step 8: Self-reported Skills */}
              {step === 8 && (
                <div>
                  <h3 className="text-lg font-extrabold text-gray-800 mb-1">🏆 今できる技は？</h3>
                  <p className="text-xs text-gray-400 mb-4">すでにできる技があれば教えてね</p>
                  <SkillPicker
                    skills={skills}
                    selected={selfReportedSkills}
                    onToggle={toggleSelfSkill}
                    multi
                  />
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => goNext({ self_reported_skills: selfReportedSkills })}
                      disabled={saving}
                      className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold disabled:opacity-40 transition"
                    >
                      {selfReportedSkills.length > 0 ? `${selfReportedSkills.length}つ選んで完了！` : "完了！"}
                    </button>
                    <button
                      onClick={() => goNext({ self_reported_skills: [] })}
                      className="px-4 py-3 rounded-2xl bg-gray-100 text-gray-400 text-sm font-medium hover:bg-gray-200 transition"
                    >
                      ない・スキップ
                    </button>
                  </div>
                </div>
              )}

              {/* Step 9: Complete */}
              {step >= TOTAL_STEPS && (
                <div className="text-center py-6">
                  <div className="text-5xl mb-4">✨</div>
                  <h2 className="text-xl font-extrabold text-gray-800 mb-2">ヒアリング完了！</h2>
                  <p className="text-sm text-gray-500 leading-relaxed mb-6">
                    あなたにピッタリのバクトレ体験を準備しました。<br />
                    さあ、冒険を始めよう！
                  </p>
                  <button
                    onClick={handleComplete}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold text-base shadow-lg hover:shadow-xl transition"
                  >
                    🚀 ダッシュボードへ
                  </button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Close button (visible on steps 2-8) */}
        {step > 1 && step < TOTAL_STEPS && (
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 flex items-center justify-center text-lg transition"
          >
            &times;
          </button>
        )}
      </motion.div>
    </div>
  );
}
