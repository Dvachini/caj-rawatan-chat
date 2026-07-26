export default function Message({ message }) {
  const isUser = message.role === 'user';
  const isError = message.role === 'error';

  return (
    <article className={`max-w-[90%] ${isUser ? 'self-end' : ''}`}>
      <span className='text-xs font-bold uppercase text-gray-500'>
        {isUser ? 'Anda' : 'Rujukan'}
      </span>
      <p
        className={`mt-1 whitespace-pre-wrap rounded-2xl px-4 py-3 leading-relaxed ${
          isUser
            ? 'rounded-tr-sm bg-[#176b57] text-white'
            : isError
              ? 'bg-red-50 text-red-800'
              : 'rounded-tl-sm bg-[#e7f0ec] text-gray-900'
        }`}
      >
        {message.text}
      </p>

      {message.sources?.length > 0 && (
        <ul className='mt-2 list-disc pl-5 text-xs text-gray-600'>
          {message.sources.map((source, index) => (
            <li key={`${source.label}-${index}`}>{source.label}</li>
          ))}
        </ul>
      )}

      {message.status === 'experiential' && (
        <small className='text-gray-500'>
          Bukan ketetapan rasmi. Sahkan sebelum kutipan.
        </small>
      )}
      {message.fallback && (
        <small className='text-gray-500'>Petikan sumber dipaparkan terus.</small>
      )}
    </article>
  );
}
