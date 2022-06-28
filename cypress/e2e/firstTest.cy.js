/// <reference types="cypress" />

context('Starting New API Module', () => {
  describe('Test with backend', () => {
    beforeEach('login into the app', () => {
      cy.intercept(
        { method: 'GET', path: 'tags' },
        { fixture: 'tags.json' }
      ).as('tagsMochs')
      cy.loginToApplication()
    })
    it('verify correct request and response', () => {
      cy.intercept('POST', '**/articles').as('postArticles')

      cy.contains('New Article').click()
      cy.get('[formcontrolname="title"]').type('This is an article')
      cy.get('[formcontrolname="description"]').type('This is a description')
      cy.get('[formcontrolname="body"]').type('This is the body of the article')
      cy.contains('Publish Article').click()

      cy.wait('@postArticles')
      cy.get('@postArticles').then(xhr => {
        cy.writeFile('cypress/json/networkRes.json', xhr)
        console.log(xhr)

        // expect(xhr.response.statusCode).to.equal(307)
        expect(xhr.request.body.article.body).to.equal(
          'This is the body of the article'
        )
        // expect(xhr.response.body.article.description).to.equal(
        //   'This is a description'
        // )
      })
    })

    it.only('intercepting and modifying the request and response', () => {
      cy.intercept('POST', '**/articles', req => {
        req.body.article.body = 'This is a body 2'
      }).as('postArticles')

      // cy.intercept('POST', '**/articles', req => {
      //   req.reply(res => {
      //     expect(res.body.article.description).to.equal('This is a description')
      //     res.body.article.description = 'This is a description 2'
      //   })
      // }).as('postArticles')

      cy.contains('New Article').click()
      cy.get('[formcontrolname="title"]').type('This is an article')
      cy.get('[formcontrolname="description"]').type('This is a description')
      cy.get('[formcontrolname="body"]').type('This is the body of the article')
      cy.contains('Publish Article').click()

      cy.wait('@postArticles')
      cy.get('@postArticles').then(xhr => {
        cy.writeFile('cypress/json/networkRes.json', xhr)
        console.log(xhr)

        // expect(xhr.response.statusCode).to.equal(307)
        expect(xhr.request.body.article.body).to.equal('This is a body 2')
        // expect(xhr.response.body.article.description).to.equal(
        //   'This is a description 2'
        // )
      })
    })

    it('should gave tags with routing objects', () => {
      cy.wait('@tagsMochs')
      cy.get('.tag-list')
        .should('contain', 'cypress')
        .and('contain', 'automation')
        .and('contain', 'testing')
        .and('contain', 'react')
    })

    it('verify global feed likes count', () => {
      cy.intercept('GET', '**/articles/feed*', {
        article: [],
        articlesCount: 0
      })
      cy.intercept('GET', '**/articles*', { fixture: 'articles.json' })

      cy.contains('Global Feed').click()
      cy.get('app-article-list button').then(listOfButtons => {
        expect(listOfButtons[0]).to.contain('2819')
      })

      cy.fixture('articles2').then(file => {
        const articleLink = file.articles[0].slug
        cy.intercept('POST', `**/articles/${articleLink}/favorite`, file)
      })

      cy.get('app-article-list button').eq(0).click().should('contain', '2820')
    })

    it.only('delete a bew article in a global feed', () => {
      const userCredential = {
        user: {
          email: 'beogomezz@hotmail.com',
          password: '123456789'
        }
      }

      cy.request(
        'POST',
        'https://conduit.productionready.io/api/users/login',
        userCredential
      )
        .its('body')
        .then(body => {
          const token = body.user.token
          const bodyRequest = {
            article: {
              tagList: [],
              title: 'Request from API',
              description: 'API testing is easy',
              body: 'OK, let`s go'
            }
          }

          cy.request({
            url: 'https://api.realworld.io/api/articles/?',
            headers: { Authorization: `Token ${token}` },
            method: 'POST',
            body: bodyRequest
          }).then(response => {
            expect(response.status).to.equal(200)
          })

          cy.contains('Global Feed').click()
          cy.get('.article-preview').first().click()
          cy.get('.article-actions').contains('Delete Article').click()

          cy.request({
            url: 'https://api.realworld.io/api/articles/feed?limit=10&offset=0',
            headers: { Authorization: `Token ${token}` },
            method: 'GET'
          })
            .its('body')
            .then(body => {
              expect(body.article[0].title).not.equal('Request from API')
            })
        })
    })
  })
})
