"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation"; // ページ遷移のために useRouter を使用
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend, Title);

interface ScoreData {
  created_at: string;
  id: number;
  score: number;
}

interface ApiResponse {
  data: ScoreData[];
  status: string;
}

export default function TotalScore() {
  const [scoreData, setScoreData] = useState<ScoreData[]>([]);
  const [filteredData, setFilteredData] = useState<ScoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  ); // 初期値は今日の日付
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  ); // 初期値は今日の日付
  const [startTime, setStartTime] = useState<number>(0); // 開始時間
  const [endTime, setEndTime] = useState<number>(23); // 終了時間

  const router = useRouter(); // ページ遷移用のルーター

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch("https://hiikunz.pythonanywhere.com/json");
      if (!response.ok) {
        throw new Error("データの取得に失敗しました");
      }
      const result: ApiResponse = await response.json();
      if (result.status === "OK") {
        setScoreData(result.data);
        setFilteredData(result.data); // 初回はすべてのデータを表示
      } else {
        throw new Error("APIからの応答が正常ではありません");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "不明なエラーが発生しました"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(); // 初回データ取得
  }, [fetchData]);

  // JSTに変換する関数
  function formatDateToJST(dateString: string) {
    const date = new Date(`${dateString}Z`);
    const formatter = new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    return formatter.format(date);
  }

  // 日付と時間フィルターを適用する関数（スライダーや日付が変わるたびに実行）
  useEffect(() => {
    if (startDate && endDate) {
      const filtered = scoreData.filter((item) => {
        const createdAt = new Date(formatDateToJST(item.created_at)).getTime(); // JSTに変換してから比較
        const start = new Date(
          `${startDate}T${String(startTime).padStart(2, "0")}:00:00+09:00`
        ).getTime();
        const end = new Date(
          `${endDate}T${String(endTime).padStart(2, "0")}:59:59+09:00`
        ).getTime();
        return createdAt >= start && createdAt <= end;
      });
      setFilteredData(filtered);
    }
  }, [startDate, endDate, startTime, endTime, scoreData]); // 変更があるたびにフィルタリングを実行

  // 楽しい (正のスコア) と疲れた (負のスコアを正の数に変換して集計)
  const totalData = filteredData.reduce(
    (acc, item) => {
      if (item.score >= 0) {
        acc.fun += item.score; // 楽しいのスコアを合計
      } else {
        acc.tired += Math.abs(item.score); // 疲れたのスコアを正の数に変換して合計
      }
      return acc;
    },
    { fun: 0, tired: 0 }
  );

  // 円グラフのデータ
  const pieChartData = {
    labels: ["楽しい", "疲れた"],
    datasets: [
      {
        label: "スコア分布",
        data: [totalData.fun, totalData.tired], // 楽しいと疲れたの合計
        backgroundColor: [
          "rgba(255, 99, 132, 0.6)", // 疲れた用
          "rgba(75, 192, 192, 0.6)", // 楽しい用
        ],
        borderWidth: 1,
      },
    ],
  };

  // グラフのオプション
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "楽しい vs 疲れた (スコアの割合)",
      },
    },
  };

  // ローディングやエラーの処理
  if (loading && scoreData.length === 0) return <div>読み込み中...</div>;
  if (error) return <div>エラー: {error}</div>;

  return (
    <div className="container mx-auto p-4 relative">
      {/* ボタンのコンテナ */}
      <div className="absolute top-0 right-0 m-4 flex space-x-2">
        {/* リアルタイムに見るボタン */}
        <button
          onClick={() => router.push("/")}
          className="bg-green-500 text-white py-2 px-4 rounded-md"
        >
          リアルタイムで見る
        </button>
        {/* 全体の推移を見るボタン */}
        <button
          onClick={() => router.push("/transition")}
          className="bg-blue-500 text-white py-2 px-4 rounded-md"
        >
          全体の推移を見る
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-4">楽しい vs 疲れた (総計)</h1>

      {/* 日付と時間の範囲指定のUI */}
      <div className="mb-4">
        <label className="block text-lg font-semibold mb-2">日付 (開始)</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)} // 日付が変更されたら即時フィルタリング
          className="p-2 border rounded-md"
        />

        <label className="block text-lg font-semibold mt-4 mb-2">
          時間 (開始)
        </label>
        <input
          type="range"
          min="0"
          max="23"
          value={startTime}
          onChange={(e) => setStartTime(Number(e.target.value))} // 時間が変更されたら即時フィルタリング
          className="w-full mb-2"
        />
        <div className="mt-2">
          <span>開始時間: {startTime}時</span>
        </div>

        <label className="block text-lg font-semibold mt-4 mb-2">
          日付 (終了)
        </label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)} // 日付が変更されたら即時フィルタリング
          className="p-2 border rounded-md"
        />

        <label className="block text-lg font-semibold mt-4 mb-2">
          時間 (終了)
        </label>
        <input
          type="range"
          min="0"
          max="23"
          value={endTime}
          onChange={(e) => setEndTime(Number(e.target.value))} // 時間が変更されたら即時フィルタリング
          className="w-full"
        />
        <div className="mt-2">
          <span>終了時間: {endTime}時</span>
        </div>
      </div>

      <div className="w-full h-96 mt-8">
        <Pie data={pieChartData} options={options} />
      </div>
      <div className="mt-8">
        <h2 className="text-xl font-bold">総計</h2>
        <p>楽しい: {totalData.fun} ポイント</p>
        <p>疲れた: {totalData.tired} ポイント</p>
      </div>
    </div>
  );
}
