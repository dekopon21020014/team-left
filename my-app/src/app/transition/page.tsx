"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation"; // ページ遷移のために useRouter を使用
import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from "chart.js";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

interface ScoreData {
    created_at: string;
    id: number;
    score: number;
}

interface ApiResponse {
    data: ScoreData[];
    status: string;
}

export default function Transition() {
    const [scoreData, setScoreData] = useState<ScoreData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter(); // ページ遷移用のルーター

    const fetchData = useCallback(async () => {
        try {
            const response = await fetch("https://hiikunz.pythonanywhere.com/json");
            if (!response.ok) {
                throw new Error("データの取得に失敗しました");
            }
            const result: ApiResponse = await response.json();
            if (result.status === "OK") {
                setScoreData(
                    result.data.sort(
                        (a, b) =>
                            new Date(a.created_at).getTime() -
                            new Date(b.created_at).getTime()
                    )
                );
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

        const intervalId = setInterval(() => {
            fetchData(); // 10秒ごとにデータを取得
        }, 10000); // 修正: 毎秒ではなく10秒に変更

        return () => clearInterval(intervalId); // コンポーネントのアンマウント時にインターバルをクリア
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

    const sumData = [];
    let sum = 0;
    for (let i = 0; i < scoreData.length; i++) {
        sum += scoreData[i].score;
        sumData.push(sum);
    }

    // グラフのデータ
    const chartData = {
        labels: scoreData.map((item) => formatDateToJST(item.created_at)), // JSTでフォーマットした日付を使う
        datasets: [
            {
                label: "スコアの和",
                data: sumData,
                borderColor: "rgb(0, 0, 0)", // 赤色
                tension: 0.1,
                spanGaps: true, // null値の部分はスキップ
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
                text: "楽しい vs 疲れた (10秒ごとに更新)",
            },
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: "日時",
                },
            },
            y: {
                title: {
                    display: true,
                    text: "スコア",
                },
            },
        },
    };

    // ローディングやエラーの処理
    if (loading && scoreData.length === 0) return <div>読み込み中...</div>;
    if (error) return <div>エラー: {error}</div>;

    return (
        <div className="container mx-auto p-4 relative">
            {/* 総計を見るボタン */}
            <button
                onClick={() => router.push("/total")} // "/total" に遷移
                className="absolute top-0 right-0 bg-green-500 text-white py-2 px-4 rounded-md m-4"
            >
                総計を見る
            </button>

            <h1 className="text-2xl font-bold mb-4">
                10秒ごとに更新されるスコアデータグラフ (楽しい vs 疲れた)
            </h1>
            <div className="w-full h-96">
                <Line data={chartData} options={options} />
            </div>
            <h2 className="text-xl font-bold mt-8 mb-4">最新のデータ</h2>
            {scoreData
                .slice(-5)
                .reverse()
                .map((item) => (
                    <div key={item.id} className="bg-white shadow-md rounded-lg p-4 mb-4">
                        <p className="text-lg font-semibold">スコア: {item.score}</p>
                        <p className="text-sm text-gray-600">
                            作成日時: {formatDateToJST(item.created_at)}
                        </p>
                        <p className="text-sm text-gray-600">ID: {item.id}</p>
                    </div>
                ))}
        </div>
    );
}
