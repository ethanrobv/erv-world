export default function Home() {
    return (
        <div className='bg-page text-text-main'>
            <main>
                {/* Hero Section */ }
                <div className='mx-auto flex max-w-6xl flex-col items-center px-6 py-24 text-center sm:py-32'>
                    <h1 className='text-4xl font-bold tracking-tight sm:text-6xl'>
                        Universal Theming
                    </h1>
                    <p className='mt-6 max-w-2xl text-lg text-text-muted'>
                        Switch between Light, Dark, and High Contrast effortlessly.
                    </p>
                    <div className='mt-10 flex items-center gap-4'>
                        {/* Primary Brand Button */ }
                        <button
                            className='rounded-md bg-primary text-primary-fg px-6 py-3 text-sm font-semibold hover:opacity-90'>
                            Get Started
                        </button>
                        {/* Secondary Button */ }
                        <button
                            className='rounded-md border border-border-base px-6 py-3 text-sm font-semibold hover:bg-surface-highlight'>
                            Documentation
                        </button>
                    </div>
                </div>

                {/* Feature Grid */ }
                <div className='mx-auto max-w-6xl px-6 pb-24'>
                    <div className='grid grid-cols-1 gap-8 sm:grid-cols-3'>
                        { [1, 2, 3].map((i) => (
                            <div key={ i } className='rounded-xl border border-border-base bg-surface p-6 shadow-sm'>
                                <div
                                    className='mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-highlight ring-1 ring-border-base'>
                                    {/* Icon placeholder */ }
                                    <span className='text-xl'>I</span>
                                </div>
                                <h3 className='font-semibold text-text-main'>Feature { i }</h3>
                                <p className='mt-2 text-sm text-text-muted'>
                                    { }
                                </p>
                            </div>
                        )) }
                    </div>
                </div>
            </main>
        </div>
    );
}
