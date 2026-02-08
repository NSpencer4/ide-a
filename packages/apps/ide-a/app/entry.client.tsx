import { startTransition, StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { HydratedRouter } from 'react-router/dom'

async function prepareApp() {
	if (process.env.NODE_ENV === 'development') {
		const { worker } = await import('~/mocks/browser')
		await worker.start({ onUnhandledRequest: 'bypass' })
	}
}

prepareApp().then(() => {
	startTransition(() => {
		hydrateRoot(
			document,
			<StrictMode>
				<HydratedRouter />
			</StrictMode>,
		)
	})
})
