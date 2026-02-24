import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIAnalysisResult } from "@/types";

const SYSTEM_PROMPT = `Sən uşaqlar və yeni başlayanlar üçün kod müəllimisən. Tələbənin yazdığı kodu analiz et və aşağıdakı qaydalara əməl et:

1. **Sadə dildə** danış — texniki terminlər əvəzinə sadə izahlar ver
2. **Həvəsləndirici** ol — səhvləri göstərərkən belə müsbət ton saxla  
3. **Emoji** istifadə et — mesajları daha maraqlı etmək üçün
4. **Konkret** ol — hansı sətirdə problem olduğunu göstər

Cavabını JSON formatında ver:
{
  "summary": "Kodun qısa qiymətləndirilməsi (1-2 cümlə, sadə dildə)",
  "errors": [
    {"line": sətir_nömrəsi_və_ya_null, "message": "Səhv haqqında sadə izah", "severity": "error" | "warning"}
  ],
  "suggestions": [
    {"message": "Təkmilləşdirmə təklifi", "type": "improvement" | "style" | "logic"}
  ],
  "status": "PASS" | "FAIL"
}

Qaydalar:
- Əgər kod heç bir ciddi səhv yoxdursa → status: "PASS"
- Əgər sintaksis və ya məntiq səhvi varsa → status: "FAIL"  
- Boş kod və ya çox qısa kod üçün dostcasına mesaj ver
- Azərbaycan dilində cavab ver`;

export async function analyzeCode(
    code: string,
    language: string
): Promise<AIAnalysisResult> {
    // If no API key, return mock analysis
    if (!process.env.GEMINI_API_KEY) {
        return getMockAnalysis(code, language);
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `${SYSTEM_PROMPT}\n\nProqramlaşdırma dili: ${language}\n\nTələbənin kodu:\n\`\`\`${language}\n${code}\n\`\`\``;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                summary: parsed.summary || "Kod analiz edildi",
                errors: parsed.errors || [],
                suggestions: parsed.suggestions || [],
                status: parsed.status || "PENDING",
            };
        }

        return {
            summary: "Kod analiz edildi ✅",
            errors: [],
            suggestions: [],
            status: "PASS",
        };
    } catch (error) {
        console.error("AI Analysis error:", error);
        return getMockAnalysis(code, language);
    }
}

function getMockAnalysis(code: string, language: string): AIAnalysisResult {
    if (!code || code.trim().length === 0) {
        return {
            summary: "📝 Hələ kod yazılmayıb. Yazmağa başla, mən sənə kömək edəcəm!",
            errors: [],
            suggestions: [
                {
                    message: "Yazmağa başlamaq üçün sadə bir 'Hello World' proqramı yaz!",
                    type: "improvement",
                },
            ],
            status: "PENDING",
        };
    }

    if (code.trim().length < 10) {
        return {
            summary: "🌱 Yaxşı başlanğıc! Kodu inkişaf etdirməyə davam et.",
            errors: [],
            suggestions: [
                {
                    message: "Kodunu bir az daha genişləndir, daha çox funksionallıq əlavə et",
                    type: "improvement",
                },
            ],
            status: "PENDING",
        };
    }

    // Basic mock checks
    const errors: AIAnalysisResult["errors"] = [];
    const suggestions: AIAnalysisResult["suggestions"] = [];

    // Check for common issues
    if (language === "javascript" || language === "typescript") {
        if (code.includes("var ")) {
            errors.push({
                message: "⚠️ 'var' əvəzinə 'let' və ya 'const' istifadə et — bu daha müasir üsuldur!",
                severity: "warning",
            });
        }
        if (code.includes("console.log")) {
            suggestions.push({
                message: "💡 console.log() debug üçün əladır, amma son versiyada silməyi unutma!",
                type: "style",
            });
        }
        if (!code.includes("//") && !code.includes("/*")) {
            suggestions.push({
                message: "📝 Koduna şərhlər (comments) əlavə et — bu başqalarının kodu başa düşməsinə kömək edir!",
                type: "improvement",
            });
        }
    }

    if (language === "python") {
        if (!code.includes("#")) {
            suggestions.push({
                message: "📝 Python-da '#' ilə şərhlər əlavə et — kodun daha aydın olar!",
                type: "improvement",
            });
        }
    }

    const hasErrors = errors.some((e) => e.severity === "error");

    return {
        summary: hasErrors
            ? "🔍 Bəzi problemlər tapdım, amma narahat olma — birlikdə düzəldəcəyik!"
            : errors.length > 0
                ? "⚡ Kod işləyir, amma bir neçə təkmilləşdirmə etmək olar!"
                : "🎉 Əla iş! Kodun yaxşı görünür!",
        errors,
        suggestions,
        status: hasErrors ? "FAIL" : "PASS",
    };
}
