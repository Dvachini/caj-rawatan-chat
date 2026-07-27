export default function Message({ message }) {
  const isUser = message.role === 'user';
  const isError = message.role === 'error';

  return (
    <article
      className={`max-w-[90%] sm:max-w-[78%] ${isUser ? 'self-end' : ''}`}
    >
      <span className='text-xs font-black uppercase tracking-wider text-[#171717]'>
        {isUser ? 'Anda' : 'Rujukan'}
      </span>
      <p
        className={`mt-1 whitespace-pre-wrap border-3 border-[#171717] px-4 py-3 font-medium leading-relaxed shadow-[4px_4px_0_#171717] ${
          isUser
            ? 'bg-[#77bdfb] text-[#171717]'
            : isError
              ? 'bg-[#ff8fab] text-[#171717]'
              : 'bg-[#fffdf5] text-[#171717]'
        }`}
      >
        {message.text}
      </p>

      {message.sources?.length > 0 && (
        <ul className='mt-3 list-disc border-l-4 border-[#171717] bg-[#ffd84d] py-2 pr-3 pl-7 text-xs font-bold text-[#171717]'>
          {message.sources.map((source, index) => (
            <li key={`${source.label}-${index}`}>{source.label}</li>
          ))}
        </ul>
      )}

      {message.status === 'experiential' && (
        <small className='mt-3 block font-bold text-[#6b3200]'>
          Bukan ketetapan rasmi. Sahkan sebelum kutipan.
        </small>
      )}
      {message.fallback && (
        <small className='mt-3 block font-bold text-[#383838]'>
          Petikan sumber dipaparkan terus.
        </small>
      )}
    </article>
  );
}
