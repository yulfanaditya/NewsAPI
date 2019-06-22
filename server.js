const express = require('express');
const knex = require('knex');
const bodyParser = require('body-parser');

const database =  knex({
    client: 'pg',
    connection: {
      host : '127.0.0.1',
      user : 'postgres',
      password : 'yulfan080495',
      database : 'newsAPI'
    }
  });

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const resetCounterLikes = function (newsid){
    database('likes')
    .count('likes_liked')
    .where({
      likes_liked : true,
      likes_news_id : newsid
    })
    .then(data=>{
      database('news')
      .where('news_id', newsid)
      .update('news_liked', data[0].count)
      .catch(err => status(400).json(err))
  })
}

const resetCounterComment = function (newsid){
  database('comment')
  .count('comment_id')
  .where('comment_news_id', newsid)
  .then(data=>{
    database('news')
    .where('news_id', newsid)
    .update('news_commented', data[0].count)
    .catch(err => status(400).json(err))
})
}

app.get('/',(req,res) =>{
database.select().from('category')
.then(data => res.json(data))
});

app.get('/:cat',(req,res) =>{
  const {cat} = req.params;

  database.select('news_id','news_tittle','news_url','news_path').from('news').rightJoin('category','news.news_category_id','category.category_id')
  .where('category_name',cat)
  .then(data=>{
    if(data.length){
      res.json(data);
    }
    else{
      res.status(404).json('Page Not Found');
    }
  })
  .catch(err=>{
  res.status(404).json('Page Not Found');
  })
});

app.get('/:cat/:news',(req,res) =>{
  const {cat, news} = req.params;

  database.select('*').from('news').rightJoin('category','news.news_category_id','category.category_id')
  .where({
    category_name: cat,
    news_path: news,
  })
  .then(data=>{
    if(data.length){
      res.json(data);
    }
    else{
      res.status(404).json('Page Not Found');
    }
  })
  .catch(err=>{
    res.status(404).json('Page Not Found',err);
    })

});

app.post('/:cat/:tit', function(req, res) {
  const {cat,tit} = req.params;
  const { username,comment,newsID,whichData} = req.body;

  switch(whichData)
  {
    case 'comment' :

        database.select('*')
        .from('users')
        .where('users_id', username)
        .then(data =>{
          if(data.length === 1){
            database('comment')
            .returning('*')
            .insert({
              comment_username_id : username ,
              comment_news_id : newsID ,
              comment_comment : comment
            })
            .then(data=>{
              res.json(data[0]);
              resetCounterComment(newsID);
            })
            .catch(err => res.status(400).json(err));       
          }
          else{
            res.status(400).send('Bad Request');
          }
        })
        .catch(err=>{
            res.status(400).json(err);
        })

      break;
    
    case 'like' :

      database.select('*').from('likes')
      .where({
        likes_username_id: username,
        likes_news_id: newsID
      })
      .then(data =>{
          if(data.length === 1){
            res.send('already exist, to toggle on/off please use put to prevent overuse database');
          }
          else{
            database('likes')
            .returning('*')
            .insert({
              likes_username_id : username ,
              likes_news_id : newsID ,
            })
            .then(data=>{
              res.json(data[0]);
              resetCounterLikes(newsID);
            })
            .catch(err => res.status(400).json(err));
          }

      })
      .catch(err => res.status(400).json(err));
      break;

    default:
        res.status(400).send(`No such ${whichData} data, Perhaps you need create a new one`);
  }

});

app.put('/:cat/:news',(req,res)=>{
  const {newsID, commentID, comment, liked, likesID, whichData} = req.body;

  switch(whichData)
  {
    case 'comment' :

      database('comment')
      .returning('*')
      .where('comment_id', commentID)
      .update('comment_comment', comment)
      .then(data=>{

        if(data.length === 0){
          res.status(400).send('The comment doesn\'t Exist, please change your comment ID request or create a new one');
        }
        else{
          res.json(data);
        }
      })
      .catch(err => res.status(400).json(err))
      break;
    
    case 'like' :
        database('likes')
        .returning('*')
        .where('likes_id', likesID)
        .update('likes_liked', liked)
        .then(data=>{
          if(data.length === 0){
            res.status(400).send('Like Doesnt Exist, please change your comment ID request or create a new one');
          }
          else{
            res.json(data);
            resetCounterLikes(newsID);
          }
        })
        .catch(err => res.status(400).json(err))
      
      break;

    default:
        res.status(400).send(`No such ${whichData} data, Perhaps you need create a new one`);
  }
});

app.delete('/:cat/:news',(req,res)=>{
  const {newsID,commentID} = req.body;

  database('comment')
  .where('comment_id', commentID)
  .del()
  .then((data)=>{
    if(data === 0){
      res.status(400).send('The Comment already removed!');
    }
    else{
      res.send('The Comment has removed');
      resetCounterComment(newsID);
    }
  })
  .catch(err => res.status(400).json(err));
});

const server = app.listen(3000, ()=>{
    console.log('Running on port',server.address().port)
});