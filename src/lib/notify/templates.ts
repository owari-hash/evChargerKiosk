import { publicEnv } from '@/lib/env';

const brand = publicEnv.brandName;

function layout(title: string, body: string, cta?: { url: string; label: string }): string {
  const button = cta
    ? `<p style="margin:28px 0"><a href="${cta.url}" style="background:#00a862;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block">${cta.label}</a></p>
       <p style="color:#64748b;font-size:13px">Товч ажиллахгүй бол энэ холбоосыг хөтөчдөө хуулж тавина уу:<br><span style="word-break:break-all">${cta.url}</span></p>`
    : '';

  return `<!doctype html><html lang="mn"><body style="margin:0;background:#f1f5f9;padding:28px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:32px">
    <p style="font-size:18px;font-weight:700;margin:0 0 24px">${brand}</p>
    <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
    ${body}
    ${button}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0">
    <p style="color:#94a3b8;font-size:12px;margin:0">Хэн нэгэн ${brand} дээр энэ хаягийг ашигласан тул та энэ и-мэйлийг хүлээн авлаа. Хэрэв та биш бол ямар нэг зүйл хийх шаардлагагүй.</p>
  </div></body></html>`;
}

export function passwordResetEmail(url: string, minutes: number) {
  return {
    subject: `${brand} нууц үгээ сэргээх`,
    text: `${brand} нууц үгээ сэргээхийн тулд ${minutes} минутын дотор энэ холбоосыг нээнэ үү:\n\n${url}\n\nХэрэв та сэргээх хүсэлт гаргаагүй бол энэ и-мэйлийг үл тоомсорлоно уу.`,
    html: layout(
      'Нууц үгээ сэргээх',
      `<p style="line-height:1.6;margin:0">Таны ${brand} бүртгэлийн нууц үгийг сэргээх хүсэлт бидэнд ирлээ. Доорх холбоос ${minutes} минутын турш хүчинтэй.</p>`,
      { url, label: 'Шинэ нууц үг сонгох' },
    ),
  };
}

export function verifyEmail(url: string) {
  return {
    subject: `${brand} и-мэйл хаягаа баталгаажуулах`,
    text: `${brand}-д тавтай морил. Энэ холбоосыг нээж и-мэйл хаягаа баталгаажуулна уу:\n\n${url}`,
    html: layout(
      'И-мэйл хаягаа баталгаажуулах',
      `<p style="line-height:1.6;margin:0">${brand} бүртгэл үүсгэсэнд баярлалаа. Цэнэглэлтийн баримт, бүртгэлийн мэдэгдэл илгээх боломжтой болгохын тулд хаягаа баталгаажуулна уу.</p>`,
      { url, label: 'И-мэйл баталгаажуулах' },
    ),
  };
}

export function welcomeEmail(name?: string) {
  return {
    subject: `${brand}-д тавтай морил`,
    text: `Сайн байна уу${name ? ` ${name}` : ''}, таны ${brand} бүртгэл бэлэн боллоо. Цэнэглэх цэг олж, аппаас цэнэглэлт эхлүүлээрэй.`,
    html: layout(
      `Тавтай морил${name ? `, ${name}` : ''}`,
      `<p style="line-height:1.6;margin:0">Таны ${brand} бүртгэл бэлэн боллоо. Ойролцоох цэнэглэх цэгийг олж, сул байдлыг шууд хараад цэнэглэлт бүрээ нэг дор хадгалаарай.</p>`,
    ),
  };
}

export function passwordResetSms(code: string, minutes: number): string {
  return `${brand}: нууц үг сэргээх код ${code}. ${minutes} минутын дараа хүчингүй болно. Энэ кодыг бусадтай бүү хуваалцаарай.`;
}

export function phoneVerifySms(code: string, minutes: number): string {
  return `${brand}: баталгаажуулах код ${code}. ${minutes} минутын дараа хүчингүй болно.`;
}
