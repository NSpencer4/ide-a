import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

const handlers = [
	http.get('https://api.example.com/user', () => {
		return HttpResponse.json({
			id: 'abc-123',
			firstName: 'John',
			lastName: 'Maverick',
		})
	}),
]

export const server = setupServer(...handlers)
